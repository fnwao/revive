"""Webhook configuration model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class WebhookEvent(str, enum.Enum):
    """Webhook event types."""
    DEAL_DETECTED = "deal.detected"
    MESSAGE_GENERATED = "message.generated"
    MESSAGE_APPROVED = "message.approved"
    MESSAGE_SENT = "message.sent"
    MESSAGE_REJECTED = "message.rejected"
    DEAL_UPDATED = "deal.updated"
    DEAL_CLOSED = "deal.closed"


class WebhookStatus(str, enum.Enum):
    """Webhook status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"


class Webhook(Base):
    """Webhook configuration."""
    
    __tablename__ = "webhooks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True)
    
    # Webhook configuration
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    secret = Column(String(255), nullable=True)  # For signature verification
    
    # Events to subscribe to
    events = Column(JSONB, nullable=False)  # Array of event types
    
    # Settings
    status = Column(String(20), default=WebhookStatus.ACTIVE.value, index=True)
    retry_count = Column(Integer, default=3)
    timeout_seconds = Column(Integer, default=30)
    
    # Statistics
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_failure_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="webhooks")
    team = relationship("Team", backref="webhooks")
    
    __table_args__ = (
        Index("idx_webhook_user_status", "user_id", "status"),
    )


class WebhookDelivery(Base):
    """Webhook delivery log."""
    
    __tablename__ = "webhook_deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(UUID(as_uuid=True), ForeignKey("webhooks.id"), nullable=False, index=True)
    
    # Delivery details
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, index=True)  # success, failed, pending
    attempts = Column(Integer, default=1)
    error_message = Column(Text, nullable=True)
    
    # Timing
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    webhook = relationship("Webhook", backref="deliveries")
    
    __table_args__ = (
        Index("idx_webhook_delivery_webhook_status", "webhook_id", "status", "triggered_at"),
    )


