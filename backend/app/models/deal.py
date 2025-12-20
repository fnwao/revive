"""Deal/Opportunity model."""
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base


class Deal(Base):
    """Deal/Opportunity from GoHighLevel."""
    
    __tablename__ = "deals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # GoHighLevel identifiers
    ghl_deal_id = Column(String(255), nullable=False, unique=True, index=True)
    ghl_contact_id = Column(String(255), nullable=True, index=True)
    ghl_pipeline_id = Column(String(255), nullable=True, index=True)
    
    # Deal data
    title = Column(String(500), nullable=True)
    status = Column(String(100), nullable=True, index=True)
    value = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(10), default="USD")
    tags = Column(JSONB, nullable=True)  # Array of tag strings from GHL
    
    # Activity tracking
    last_activity_date = Column(DateTime(timezone=True), nullable=True, index=True)
    last_contact_date = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="deals")
    conversations = relationship("Conversation", back_populates="deal", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_deal_user_activity", "user_id", "last_activity_date"),
    )

