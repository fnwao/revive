"""Approval queue API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.approval_queue import ApprovalQueue, ApprovalStatus
from app.models.deal import Deal
from app.schemas.approval import (
    ApprovalListResponse,
    ApprovalItem,
    ApproveRequest,
    RejectRequest,
    SendRequest,
    UpdateMessageRequest,
    FeedbackRequest,
    ApprovalActionResponse
)
from app.services.approval import send_approved_message
from app.services.notification_service import NotificationService, NotificationType
from app.services.webhook_service import WebhookService
from app.models.webhook import WebhookEvent
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get(
    "",
    response_model=ApprovalListResponse,
    summary="List approvals",
    description="""
    List message approvals in the queue.
    
    Filter by status, deal_id, or date range.
    """
)
async def list_approvals(
    status_filter: str = Query(None, description="Filter by status: pending, approved, rejected, sent"),
    deal_id: str = Query(None, description="Filter by deal ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List approvals for the current user.
    """
    try:
        # Build query
        query = db.query(ApprovalQueue).filter(ApprovalQueue.user_id == current_user.id)
        
        # Apply filters
        if status_filter:
            try:
                status_enum = ApprovalStatus(status_filter.lower())
                query = query.filter(ApprovalQueue.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}. Must be one of: pending, approved, rejected, sent"
                )
        
        if deal_id:
            # Find deal by GHL deal ID
            deal = db.query(Deal).filter(
                and_(
                    Deal.user_id == current_user.id,
                    Deal.ghl_deal_id == deal_id
                )
            ).first()
            if deal:
                query = query.filter(ApprovalQueue.deal_id == deal.id)
            else:
                # No deals found, return empty
                query = query.filter(False)
        
        # Get total counts
        total = query.count()
        pending_count = query.filter(ApprovalQueue.status == ApprovalStatus.PENDING).count()
        approved_count = query.filter(ApprovalQueue.status == ApprovalStatus.APPROVED).count()
        rejected_count = query.filter(ApprovalQueue.status == ApprovalStatus.REJECTED).count()
        sent_count = query.filter(ApprovalQueue.status == ApprovalStatus.SENT).count()
        
        # Apply pagination and ordering
        approvals = query.order_by(ApprovalQueue.created_at.desc()).offset(offset).limit(limit).all()
        
        # Convert to response schema
        approval_items = []
        for approval in approvals:
            # Get deal title if available
            deal = db.query(Deal).filter(Deal.id == approval.deal_id).first()
            deal_title = deal.title if deal else None
            
            approval_items.append(ApprovalItem(
                id=str(approval.id),
                deal_id=approval.ghl_deal_id,  # Return GHL deal ID for convenience
                ghl_deal_id=approval.ghl_deal_id,
                deal_title=deal_title,
                generated_message=approval.generated_message,
                edited_message=approval.edited_message,
                user_feedback=approval.user_feedback,
                status=approval.status.value,
                created_at=approval.created_at,
                approved_at=approval.approved_at,
                sent_at=approval.sent_at,
                scheduled_at=approval.scheduled_at
            ))
        
        return ApprovalListResponse(
            approvals=approval_items,
            total=total,
            pending=pending_count,
            approved=approved_count,
            rejected=rejected_count,
            sent=sent_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing approvals: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing approvals: {str(e)}"
        )


@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalActionResponse,
    summary="Approve message",
    description="""
    Approve a generated message as-is.
    
    This marks the message as approved but does NOT send it.
    Use the send endpoint to actually send the message.
    """
)
async def approve_message(
    approval_id: str,
    request: ApproveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a message (mark as approved, don't send yet).
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        if approval.status != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Approval is not pending (current status: {approval.status.value})"
            )
        
        # Update status
        approval.status = ApprovalStatus.APPROVED
        approval.approved_at = datetime.now()
        db.commit()
        
        # Create notification
        deal = db.query(Deal).filter(Deal.id == approval.deal_id).first()
        NotificationService.create_notification(
            db=db,
            user_id=str(current_user.id),
            notification_type=NotificationType.MESSAGE_APPROVED,
            title="Message Approved",
            message=f"Your message for {deal.title if deal else 'deal'} has been approved.",
            data={"approval_id": approval_id, "deal_id": approval.ghl_deal_id}
        )
        
        # Trigger webhook
        await WebhookService.trigger_webhooks_for_event(
            db=db,
            user_id=str(current_user.id),
            event_type=WebhookEvent.MESSAGE_APPROVED,
            payload={
                "approval_id": approval_id,
                "deal_id": approval.ghl_deal_id,
                "approved_at": approval.approved_at.isoformat()
            }
        )
        
        logger.info(f"Message approved: {approval_id}")
        
        return ApprovalActionResponse(
            id=approval_id,
            status=approval.status.value,
            message="Message approved successfully",
            sent=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving message: {str(e)}"
        )


@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalActionResponse,
    summary="Reject message",
    description="Reject a generated message. The message will not be sent."
)
async def reject_message(
    approval_id: str,
    request: RejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a message.
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        if approval.status != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Approval is not pending (current status: {approval.status.value})"
            )
        
        # Update status
        approval.status = ApprovalStatus.REJECTED
        db.commit()
        
        logger.info(f"Message rejected: {approval_id}")
        
        return ApprovalActionResponse(
            id=approval_id,
            status=approval.status.value,
            message="Message rejected",
            sent=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting message: {str(e)}"
        )


@router.put(
    "/{approval_id}/edit",
    response_model=ApprovalActionResponse,
    summary="Update edited message",
    description="""
    Update the edited version of a message.
    
    This allows users to manually edit the AI-generated message before sending.
    """
)
async def update_edited_message(
    approval_id: str,
    request: UpdateMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the edited message for an approval.
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        if approval.status == ApprovalStatus.SENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit a message that has already been sent"
            )
        
        # Update edited message
        approval.edited_message = request.edited_message
        db.commit()
        
        logger.info(f"Message edited: {approval_id}")
        
        return ApprovalActionResponse(
            id=approval_id,
            status=approval.status.value,
            message="Message updated successfully",
            sent=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating message: {str(e)}"
        )


@router.post(
    "/{approval_id}/feedback",
    response_model=ApprovalActionResponse,
    summary="Submit feedback",
    description="""
    Submit feedback on an AI-generated message.
    
    This feedback helps improve future AI-generated messages.
    """
)
async def submit_feedback(
    approval_id: str,
    request: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback on an AI-generated message.
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        # Save feedback
        approval.user_feedback = request.feedback
        db.commit()
        
        logger.info(f"Feedback submitted: {approval_id}")
        
        return ApprovalActionResponse(
            id=approval_id,
            status=approval.status.value,
            message="Feedback submitted successfully",
            sent=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting feedback: {str(e)}"
        )


@router.post(
    "/{approval_id}/regenerate",
    response_model=ApprovalActionResponse,
    summary="Regenerate message with feedback",
    description="""
    Regenerate an AI-generated message incorporating user feedback.
    
    This endpoint:
    1. Takes the user's feedback
    2. Fetches the deal and conversation history
    3. Regenerates the message using AI with the feedback incorporated
    4. Updates the approval's generated_message
    """
)
async def regenerate_message(
    approval_id: str,
    request: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate a message based on user feedback.
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        if approval.status == ApprovalStatus.SENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot regenerate a message that has already been sent"
            )
        
        # Get deal
        deal = db.query(Deal).filter(Deal.id == approval.deal_id).first()
        if not deal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal not found for approval {approval_id}"
            )
        
        # Get GHL service and fetch conversation history
        from app.services.ghl import get_ghl_service
        ghl_service = get_ghl_service(current_user)
        conversations = await ghl_service.get_deal_conversations(approval.ghl_deal_id, limit=20)
        
        # Calculate days since activity
        days_since_activity = 0
        if deal.last_activity_date:
            from datetime import datetime, timezone
            last_activity = deal.last_activity_date
            if last_activity.tzinfo:
                last_activity = last_activity.replace(tzinfo=None)
            days_since_activity = (datetime.now() - last_activity).days
        
        # Regenerate message using AI with feedback
        from app.services.ai import AIService
        ai_service = AIService()
        previous_message = approval.edited_message or approval.generated_message
        regenerated_message = ai_service.generate_reactivation_message(
            deal_title=deal.title or "Deal",
            deal_value=deal.value,
            deal_status=deal.status or "active",
            days_since_activity=days_since_activity,
            conversations=conversations,
            max_length=160,
            feedback=request.feedback,
            previous_message=previous_message
        )
        
        # Update approval with new message and feedback
        approval.generated_message = regenerated_message
        approval.user_feedback = request.feedback
        approval.status = ApprovalStatus.PENDING  # Reset to pending for review
        db.commit()
        
        logger.info(f"Message regenerated: {approval_id}")
        
        return ApprovalActionResponse(
            id=approval_id,
            status=approval.status.value,
            message="Message regenerated successfully",
            sent=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error regenerating message: {str(e)}"
        )


@router.post(
    "/{approval_id}/send",
    response_model=ApprovalActionResponse,
    summary="Send message",
    description="""
    Send an approved message via GHL.
    
    You can optionally provide an edited_message to send a modified version.
    If no edited_message is provided, uses the generated_message.
    """
)
async def send_message(
    approval_id: str,
    request: SendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message (with optional edits).
    """
    try:
        approval = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.id == approval_id,
                ApprovalQueue.user_id == current_user.id
            )
        ).first()
        
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval not found: {approval_id}"
            )
        
        if approval.status == ApprovalStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send a rejected message"
            )
        
        if approval.status == ApprovalStatus.SENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message has already been sent"
            )
        
        # If edited message provided, save it
        if request.edited_message:
            approval.edited_message = request.edited_message
        
        # Check if message should be scheduled
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        if request.scheduled_at:
            # Pydantic should have already parsed this as datetime
            scheduled_time = request.scheduled_at
            
            # Ensure timezone-aware (Pydantic may parse as naive datetime)
            if scheduled_time.tzinfo is None:
                scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)
            
            if scheduled_time <= now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled time must be in the future"
                )
            
            # Schedule the message
            approval.scheduled_at = scheduled_time
            approval.status = ApprovalStatus.APPROVED  # Mark as approved and scheduled
            db.commit()
            
            # Schedule Celery task to send at the right time
            from app.workers.tasks import send_scheduled_message
            delay_seconds = (scheduled_time - now).total_seconds()
            send_scheduled_message.apply_async(
                args=[str(approval.id)],
                countdown=int(delay_seconds)
            )
            
            logger.info(f"Message scheduled: {approval_id} for {scheduled_time}")
            
            return ApprovalActionResponse(
                id=approval_id,
                status=approval.status.value,
                message=f"Message scheduled for {scheduled_time.isoformat()}",
                sent=False
            )
        else:
            # Send immediately
            success = await send_approved_message(
                db=db,
                approval=approval,
                user=current_user,
                edited_message=request.edited_message
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send message via GHL"
                )
            
            logger.info(f"Message sent: {approval_id}")
            
            return ApprovalActionResponse(
                id=approval_id,
                status=approval.status.value,
                message="Message sent successfully",
                sent=True
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message: {str(e)}"
        )

