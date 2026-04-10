"""Notification model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Index
from app.db.compat import CompatUUID, CompatJSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class NotificationType(str, enum.Enum):
    """Types of notifications."""
    DEAL_DETECTED = "deal_detected"
    MESSAGE_GENERATED = "message_generated"
    APPROVAL_NEEDED = "approval_needed"
    MESSAGE_APPROVED = "message_approved"
    MESSAGE_SENT = "message_sent"
    MESSAGE_REJECTED = "message_rejected"
    DEAL_UPDATED = "deal_updated"
    SYSTEM_ALERT = "system_alert"


class NotificationStatus(str, enum.Enum):
    """Notification read status."""
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class Notification(Base):
    """User notifications."""
    
    __tablename__ = "notifications"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(CompatUUID, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification content
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(CompatJSONB, nullable=True)  # Additional context data
    
    # Status
    status = Column(String(20), default=NotificationStatus.UNREAD.value, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", backref="notifications")
    
    __table_args__ = (
        Index("idx_notification_user_status", "user_id", "status", "created_at"),
    )


