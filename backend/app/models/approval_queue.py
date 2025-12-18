"""Approval queue model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    
    # GoHighLevel identifiers
    ghl_deal_id = Column(String(255), nullable=False, index=True)
    ghl_contact_id = Column(String(255), nullable=True)
    
    # Message data
    generated_message = Column(Text, nullable=False)
    edited_message = Column(Text, nullable=True)  # User edits before sending
    final_message = Column(Text, nullable=True)  # Message that was actually sent
    
    # Status
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING, index=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", backref="approvals")
    deal = relationship("Deal", backref="approvals")

