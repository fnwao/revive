"""Notification service for creating and managing notifications."""
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.models.user import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications."""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: dict = None
    ) -> Notification:
        """
        Create a new notification.
        
        Args:
            db: Database session
            user_id: User ID to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional context data
        
        Returns:
            Created Notification
        """
        notification = Notification(
            user_id=user_id,
            type=notification_type.value,
            title=title,
            message=message,
            data=data or {},
            status=NotificationStatus.UNREAD.value
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Created notification {notification.id} for user {user_id}")
        return notification
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if not notification:
            return False
        
        notification.status = NotificationStatus.READ.value
        notification.read_at = datetime.now()
        db.commit()
        
        return True
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: str) -> int:
        """Mark all unread notifications as read for a user."""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.status == NotificationStatus.UNREAD.value
        ).update({
            "status": NotificationStatus.READ.value,
            "read_at": datetime.now()
        })
        
        db.commit()
        return count
    
    @staticmethod
    def get_unread_count(db: Session, user_id: str) -> int:
        """Get count of unread notifications."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.status == NotificationStatus.UNREAD.value
        ).count()


