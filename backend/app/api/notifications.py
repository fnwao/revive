"""Notification API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationStatus
from app.services.notification_service import NotificationService
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    status: str
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """List of notifications."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    status_filter: Optional[str] = Query(None, description="Filter by status: unread, read, archived"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List notifications for the current user."""
    try:
        query = db.query(Notification).filter(Notification.user_id == current_user.id)
        
        if status_filter:
            query = query.filter(Notification.status == status_filter)
        
        total = query.count()
        unread_count = NotificationService.get_unread_count(db, str(current_user.id))
        
        notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
        
        return NotificationListResponse(
            notifications=[
                NotificationResponse(
                    id=str(n.id),
                    type=n.type,
                    title=n.title,
                    message=n.message,
                    data=n.data,
                    status=n.status,
                    read_at=n.read_at,
                    created_at=n.created_at
                )
                for n in notifications
            ],
            total=total,
            unread_count=unread_count
        )
    except Exception as e:
        logger.error(f"Error listing notifications: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing notifications: {str(e)}"
        )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications."""
    count = NotificationService.get_unread_count(db, str(current_user.id))
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    success = NotificationService.mark_as_read(db, notification_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"success": True}


@router.post("/mark-all-read")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read."""
    count = NotificationService.mark_all_as_read(db, str(current_user.id))
    return {"marked_count": count}


