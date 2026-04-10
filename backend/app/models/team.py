"""Team/Organization model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Index
from app.db.compat import CompatUUID, CompatJSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base


class TeamRole(str, enum.Enum):
    """Team member roles."""
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"


class Team(Base):
    """Team/Organization."""
    
    __tablename__ = "teams"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Settings
    settings = Column(CompatJSONB, nullable=True)  # Team-level settings
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(CompatUUID, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    """Team membership."""
    
    __tablename__ = "team_members"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    team_id = Column(CompatUUID, ForeignKey("teams.id"), nullable=False, index=True)
    user_id = Column(CompatUUID, ForeignKey("users.id"), nullable=False, index=True)
    
    # Role and permissions
    role = Column(String(50), default=TeamRole.MEMBER.value, index=True)
    permissions = Column(CompatJSONB, nullable=True)  # Custom permissions
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Metadata
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    invited_by = Column(CompatUUID, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], backref="team_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    __table_args__ = (
        Index("idx_team_member_unique", "team_id", "user_id", unique=True),
    )


