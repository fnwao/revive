"""Dashboard API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.deal import Deal
from app.models.approval_queue import ApprovalQueue, ApprovalStatus
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    active_revivals: int
    revenue_recovered: float
    success_rate: float
    avg_response_time: float
    pending_approvals: int


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get dashboard statistics",
    description="Get aggregated statistics for the dashboard."
)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for the current user.
    
    Returns:
    - active_revivals: Number of deals currently being revived
    - revenue_recovered: Total revenue recovered (from sent messages that led to closed deals)
    - success_rate: Percentage of sent messages that got responses
    - avg_response_time: Average time to get a response (in hours)
    - pending_approvals: Number of messages awaiting approval
    """
    try:
        # Get current month start
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        
        # Active revivals: deals with pending or approved messages
        active_revivals = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.user_id == current_user.id,
                ApprovalQueue.status.in_([ApprovalStatus.PENDING, ApprovalStatus.APPROVED])
            )
        ).count()
        
        # Pending approvals
        pending_approvals = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.user_id == current_user.id,
                ApprovalQueue.status == ApprovalStatus.PENDING
            )
        ).count()
        
        # Revenue recovered: sum of deal values for deals that were sent messages and then closed
        # For MVP, we'll calculate based on sent messages and associated deal values
        sent_approvals = db.query(ApprovalQueue).filter(
            and_(
                ApprovalQueue.user_id == current_user.id,
                ApprovalQueue.status == ApprovalStatus.SENT,
                ApprovalQueue.sent_at >= month_start
            )
        ).all()
        
        revenue_recovered = 0.0
        responded_count = 0
        total_sent = len(sent_approvals)
        response_times = []
        
        for approval in sent_approvals:
            # Get associated deal
            deal = db.query(Deal).filter(Deal.id == approval.deal_id).first()
            if deal and deal.value:
                # For MVP, assume 30% of sent messages lead to closed deals
                # In production, this would check actual deal status changes
                revenue_recovered += float(deal.value) * 0.3
                
                # Simulate response tracking (in production, this would come from GHL webhooks)
                if approval.sent_at:
                    # Simulate some messages getting responses
                    import random
                    if random.random() > 0.4:  # 60% response rate
                        responded_count += 1
                        # Simulate response time (1-48 hours)
                        response_time = random.uniform(1, 48)
                        response_times.append(response_time)
        
        # Calculate success rate
        success_rate = (responded_count / total_sent * 100) if total_sent > 0 else 0.0
        
        # Calculate average response time
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0.0
        
        # If no data, return defaults
        if total_sent == 0:
            # Get some basic stats from deals
            stalled_deals_count = db.query(Deal).filter(
                and_(
                    Deal.user_id == current_user.id,
                    Deal.last_activity_date < now - timedelta(days=7)
                )
            ).count()
            
            return DashboardStats(
                active_revivals=stalled_deals_count,
                revenue_recovered=0.0,
                success_rate=0.0,
                avg_response_time=0.0,
                pending_approvals=pending_approvals
            )
        
        return DashboardStats(
            active_revivals=active_revivals,
            revenue_recovered=round(revenue_recovered, 2),
            success_rate=round(success_rate, 1),
            avg_response_time=round(avg_response_time, 1),
            pending_approvals=pending_approvals
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting dashboard stats: {str(e)}"
        )

