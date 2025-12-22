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
from app.services.intelligence import IntelligenceService
from app.services.notification_service import NotificationService, NotificationType
from app.services.webhook_service import WebhookService
from app.models.webhook import WebhookEvent
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
        # Validate request - allow no pipeline_id if user has GHL connected (will fetch all deals)
        if not request.pipeline_id and not request.deal_ids:
            # Check if user has GHL credentials - if so, allow fetching all deals
            if not current_user.ghl_access_token or not current_user.ghl_location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either pipeline_id or deal_ids must be provided, or connect your GHL account to fetch all deals"
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
            threshold_days=request.stalled_threshold_days,
            status_filter=request.status_filter,
            tags_filter=request.tags_filter
        )
        
        # Add intelligence scoring to each deal
        intelligence_service = IntelligenceService()
        ghl_service = get_ghl_service(current_user)
        
        for deal_data in stalled_deals_data:
            # Fetch conversation history for intelligence analysis
            try:
                conversations = await ghl_service.get_deal_conversations(
                    deal_data.get("deal_id"), 
                    limit=20
                )
                
                # Analyze sentiment
                sentiment_analysis = intelligence_service.analyze_conversation_sentiment(conversations)
                
                # Calculate deal score
                deal_score = intelligence_service.calculate_deal_score(
                    deal_value=deal_data.get("value"),
                    days_since_activity=deal_data.get("days_since_activity", 0),
                    conversation_count=len(conversations),
                    last_message_sentiment=sentiment_analysis.get("last_message_sentiment"),
                    deal_stage=deal_data.get("status", "active")
                )
                
                # Predict response probability
                response_prediction = intelligence_service.predict_response_probability(
                    days_since_activity=deal_data.get("days_since_activity", 0),
                    conversation_count=len(conversations),
                    last_message_sentiment=sentiment_analysis.get("last_message_sentiment"),
                    deal_value=deal_data.get("value")
                )
                
                # Add intelligence data to deal
                deal_data["intelligence_score"] = deal_score["score"]
                deal_data["priority"] = deal_score["priority"]
                deal_data["insights"] = deal_score["insights"]
                deal_data["recommended_action"] = deal_score["recommended_action"]
                deal_data["response_probability"] = response_prediction["probability"]
                deal_data["response_confidence"] = response_prediction["confidence"]
                deal_data["sentiment"] = sentiment_analysis.get("overall_sentiment", "neutral")
            except Exception as e:
                logger.warning(f"Error adding intelligence to deal {deal_data.get('deal_id')}: {e}")
                # Add default values if intelligence analysis fails
                deal_data["intelligence_score"] = 50.0
                deal_data["priority"] = "medium"
                deal_data["insights"] = []
                deal_data["recommended_action"] = "Send follow-up message"
                deal_data["response_probability"] = 50.0
                deal_data["response_confidence"] = 50.0
                deal_data["sentiment"] = "neutral"
        
        # Sort by intelligence score (highest first)
        stalled_deals_data.sort(key=lambda x: x.get("intelligence_score", 0), reverse=True)
        
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
        
        # Generate message sequence using AI (3-4 shorter messages)
        ai_service = AIService()
        generated_messages = ai_service.generate_reactivation_message(
            deal_title=deal.title or ghl_deal.get("title", "Deal"),
            deal_value=deal.value,
            deal_status=deal.status or "active",
            days_since_activity=days_since_activity or 0,
            conversations=conversations,
            max_length=160,  # SMS limit per message
            generate_sequence=True  # Generate 3-4 messages for natural flow
        )
        
        # Store messages as JSON array
        import json
        generated_message_json = json.dumps(generated_messages)
        
        # Create message sequence with delays (human-like timing: 30s, 2min, 5min between messages)
        message_sequence = []
        delays_seconds = [0, 30, 120, 300]  # 0s, 30s, 2min, 5min
        for i, msg in enumerate(generated_messages):
            message_sequence.append({
                "message": msg,
                "order": i + 1,
                "delay_seconds": delays_seconds[i] if i < len(delays_seconds) else delays_seconds[-1]
            })
        
        # Store in approval queue
        approval = ApprovalQueue(
            id=uuid.uuid4(),
            user_id=current_user.id,
            deal_id=deal.id,
            ghl_deal_id=deal.ghl_deal_id,
            ghl_contact_id=deal.ghl_contact_id,
            generated_message=generated_message_json,
            message_sequence=json.dumps(message_sequence),
            status=ApprovalStatus.PENDING
        )
        
        db.add(approval)
        db.commit()
        db.refresh(approval)
        
        # Create notification
        NotificationService.create_notification(
            db=db,
            user_id=str(current_user.id),
            notification_type=NotificationType.MESSAGE_GENERATED,
            title="New Message Generated",
            message=f"AI has generated a reactivation message for {deal.title or 'a deal'}. Review and approve to send.",
            data={"approval_id": str(approval.id), "deal_id": deal_id}
        )
        
        # Trigger webhook
        await WebhookService.trigger_webhooks_for_event(
            db=db,
            user_id=str(current_user.id),
            event_type=WebhookEvent.MESSAGE_GENERATED,
            payload={
                "approval_id": str(approval.id),
                "deal_id": deal_id,
                "generated_message": generated_message,
                "created_at": approval.created_at.isoformat()
            }
        )
        
        logger.info(f"Generated message for deal {deal_id}, approval ID: {approval.id}")
        
        # Return first message for backward compatibility, but frontend should handle sequences
        first_message = generated_messages[0] if generated_messages else ""
        
        return GenerateMessageResponse(
            approval_id=str(approval.id),
            deal_id=deal_id,
            generated_message=first_message,  # First message for backward compatibility
            generated_messages=generated_messages,  # Full sequence
            message_sequence=message_sequence,  # Sequence with delays
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
