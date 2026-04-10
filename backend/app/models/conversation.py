"""Conversation message model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from app.db.compat import CompatUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class MessageType(str, enum.Enum):
    """Message type enumeration."""
    SMS = "sms"
    EMAIL = "email"
    CALL = "call"
    NOTE = "note"


class Conversation(Base):
    """Conversation messages from GoHighLevel."""
    
    __tablename__ = "conversations"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    deal_id = Column(CompatUUID, ForeignKey("deals.id"), nullable=False, index=True)
    user_id = Column(CompatUUID, ForeignKey("users.id"), nullable=False, index=True)
    
    # GoHighLevel identifiers
    ghl_message_id = Column(String(255), nullable=True, unique=True, index=True)
    ghl_contact_id = Column(String(255), nullable=True, index=True)
    
    # Message data
    message_type = Column(SQLEnum(MessageType), nullable=False, index=True)
    direction = Column(String(20), nullable=False)  # "inbound" or "outbound"
    content = Column(Text, nullable=False)
    
    # Metadata
    sent_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    deal = relationship("Deal", back_populates="conversations")
    user = relationship("User", backref="conversations")

