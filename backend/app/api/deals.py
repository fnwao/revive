"""Deal-related API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.deal import Deal
from app.models.approval_queue import ApprovalQueue, ApprovalStatus
from app.schemas.deal import DetectStalledRequest, DetectStalledResponse, StalledDeal
from app.schemas.message import GenerateMessageResponse
from app.services.deal_detection import detect_stalled_deals
from app.services.ghl import get_ghl_service
from app.services.ai import AIService
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deals", tags=["deals"])


@router.post(
    "/detect-stalled",
    response_model=DetectStalledResponse,
    summary="Detect stalled deals",
    description="""
    Detect deals that have been inactive for a specified number of days.
    
    You can either:
    - Check all deals in a pipeline (provide `pipeline_id`)
    - Check specific deals (provide `deal_ids` list)
    
    A deal is considered stalled if its last activity date is older than
    the threshold (default: 7 days).
    """
)
async def detect_stalled(
    request: DetectStalledRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detect stalled deals in GoHighLevel.
    
    Returns a list of deals that haven't had activity for the specified
    number of days.
    """
    try:
        # Validate request
        if not request.pipeline_id and not request.deal_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either pipeline_id or deal_ids must be provided"
            )
        
        if request.pipeline_id and request.deal_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either pipeline_id OR deal_ids, not both"
            )
        
        # Detect stalled deals
        stalled_deals_data = await detect_stalled_deals(
            user=current_user,
            pipeline_id=request.pipeline_id,
            deal_ids=request.deal_ids,
            threshold_days=request.stalled_threshold_days
        )
        
        # Convert to response schema
        stalled_deals = [
            StalledDeal(**deal_data)
            for deal_data in stalled_deals_data
        ]
        
        return DetectStalledResponse(
            stalled_deals=stalled_deals,
            total_found=len(stalled_deals),
            threshold_days=request.stalled_threshold_days
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting stalled deals: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting stalled deals: {str(e)}"
        )


@router.post(
    "/{deal_id}/generate-message",
    response_model=GenerateMessageResponse,
    summary="Generate reactivation message",
    description="""
    Generate an AI-powered reactivation message for a stalled deal.
    
    This endpoint:
    1. Fetches the deal details
    2. Retrieves recent conversation history (last 10-20 messages)
    3. Calls OpenAI GPT-4 to generate a context-aware message
    4. Stores the message in the approval queue
    5. Returns the generated message
    
    The message will be pending approval before it can be sent.
    """
)
async def generate_message(
    deal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a reactivation message for a stalled deal.
    """
    try:
        # Get GHL service
        ghl_service = get_ghl_service(current_user)
        
        # Fetch deal from GHL
        ghl_deal = await ghl_service.get_deal(deal_id)
        if not ghl_deal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal not found: {deal_id}"
            )
        
        # Sync deal to database
        deal = ghl_service.sync_deal_to_db(db, ghl_deal)
        
        # Fetch conversation history
        conversations = await ghl_service.get_deal_conversations(deal_id, limit=20)
        
        # Calculate days since activity
        days_since_activity = None
        if deal.last_activity_date:
            # Handle timezone-aware datetime
            last_activity = deal.last_activity_date
            if last_activity.tzinfo:
                last_activity = last_activity.replace(tzinfo=None)
            days_since_activity = (datetime.now() - last_activity).days
        
        # Generate message using AI
        ai_service = AIService()
        generated_message = ai_service.generate_reactivation_message(
            deal_title=deal.title or ghl_deal.get("title", "Deal"),
            deal_value=deal.value,
            deal_status=deal.status or "active",
            days_since_activity=days_since_activity or 0,
            conversations=conversations,
            max_length=160  # SMS limit
        )
        
        # Store in approval queue
        approval = ApprovalQueue(
            id=uuid.uuid4(),
            user_id=current_user.id,
            deal_id=deal.id,
            ghl_deal_id=deal.ghl_deal_id,
            ghl_contact_id=deal.ghl_contact_id,
            generated_message=generated_message,
            status=ApprovalStatus.PENDING
        )
        
        db.add(approval)
        db.commit()
        db.refresh(approval)
        
        logger.info(f"Generated message for deal {deal_id}, approval ID: {approval.id}")
        
        return GenerateMessageResponse(
            approval_id=str(approval.id),
            deal_id=deal_id,
            generated_message=generated_message,
            status=approval.status.value,
            created_at=approval.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating message: {str(e)}"
        )
