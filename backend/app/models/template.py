"""Message template model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class TemplateType(str, enum.Enum):
    """Template types."""
    SMS = "sms"
    EMAIL = "email"
    BOTH = "both"


class TemplateCategory(str, enum.Enum):
    """Template categories."""
    REACTIVATION = "reactivation"
    FOLLOW_UP = "follow_up"
    VALUE_PROPOSITION = "value_proposition"
    URGENT = "urgent"
    CASUAL = "casual"
    FORMAL = "formal"
    CUSTOM = "custom"


class MessageTemplate(Base):
    """Reusable message templates."""
    
    __tablename__ = "message_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # Null for team templates
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True)  # For team-shared templates
    
    # Template content
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(20), default=TemplateType.SMS.value)
    category = Column(String(50), nullable=True, index=True)
    
    # Template body
    subject = Column(String(255), nullable=True)  # For email templates
    body = Column(Text, nullable=False)  # Template content with variables
    
    # Variables that can be used in template
    variables = Column(JSONB, nullable=True)  # e.g., ["deal_title", "deal_value", "contact_name"]
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    success_rate = Column(Integer, nullable=True)  # Percentage of successful responses
    
    # Settings
    is_public = Column(Boolean, default=False)  # Public to team
    is_active = Column(Boolean, default=True, index=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="templates")
    team = relationship("Team", backref="templates")
    creator = relationship("User", foreign_keys=[created_by])
    
    __table_args__ = (
        Index("idx_template_user_active", "user_id", "is_active"),
        Index("idx_template_team_active", "team_id", "is_active"),
    )


