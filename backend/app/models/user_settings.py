"""User settings model."""
from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, JSON
from app.db.compat import CompatUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class UserSettings(Base):
    """User preferences and configuration settings."""
    
    __tablename__ = "user_settings"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(CompatUUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Revival settings
    auto_detect_stalled = Column(Boolean, default=True, nullable=False)
    stalled_threshold_days = Column(Integer, default=7, nullable=False)
    require_approval = Column(Boolean, default=True, nullable=False)
    auto_approve = Column(Boolean, default=False, nullable=False)
    
    # Notification settings
    email_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    notify_on_stalled = Column(Boolean, default=True, nullable=False)
    notify_on_response = Column(Boolean, default=True, nullable=False)
    
    # GoHighLevel integration
    ghl_connected = Column(Boolean, default=False, nullable=False)
    ghl_api_key = Column(String(255), nullable=True)  # Should be encrypted in production
    
    # Additional settings stored as JSON for flexibility
    extra_settings = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="settings")


