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
    ApprovalActionResponse
)
from app.services.approval import send_approved_message
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
                status=approval.status.value,
                created_at=approval.created_at,
                approved_at=approval.approved_at,
                sent_at=approval.sent_at
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
        
        # Send the message
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

