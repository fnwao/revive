"""User model."""
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base import Base


class User(Base):
    """User account with GHL integration."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    api_key_hash = Column(String(255), nullable=False, unique=True, index=True)
    
    # GoHighLevel credentials (encrypted in production)
    ghl_access_token = Column(Text, nullable=True)
    ghl_refresh_token = Column(Text, nullable=True)
    ghl_location_id = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

