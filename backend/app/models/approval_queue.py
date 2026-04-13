"""Approval queue model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from app.db.compat import CompatUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class ApprovalStatus(str, enum.Enum):
    """Approval status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT = "sent"


class ApprovalQueue(Base):
    """Generated messages awaiting approval."""
    
    __tablename__ = "approval_queue"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(CompatUUID, ForeignKey("users.id"), nullable=False, index=True)
    deal_id = Column(CompatUUID, ForeignKey("deals.id"), nullable=False, index=True)
    
    # GoHighLevel identifiers
    ghl_deal_id = Column(String(255), nullable=False, index=True)
    ghl_contact_id = Column(String(255), nullable=True)
    
    # Message data
    generated_message = Column(Text, nullable=False)  # JSON array for message sequences, or single message
    edited_message = Column(Text, nullable=True)  # JSON array for edited sequences, or single edited message
    final_message = Column(Text, nullable=True)  # JSON array for sent sequences, or single sent message
    user_feedback = Column(Text, nullable=True)  # User feedback for AI improvement
    message_sequence = Column(Text, nullable=True)  # JSON array of message sequence with delays
    
    # Template and channel
    template_id = Column(CompatUUID, ForeignKey("message_templates.id"), nullable=True)
    channel = Column(String(20), default="sms", index=True)  # sms, email, both
    email_subject = Column(String(255), nullable=True)  # For email messages
    
    # Status
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING, index=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True, index=True)  # When message should be sent
    ai_context = Column(Text, nullable=True)  # JSON snapshot of AI context used for generation

    # Relationships
    user = relationship("User", backref="approvals")
    deal = relationship("Deal", backref="approvals")
    template = relationship("MessageTemplate", backref="approvals")

