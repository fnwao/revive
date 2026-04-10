"""Knowledge base document model."""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from app.db.compat import CompatUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base


class KnowledgeBaseDocument(Base):
    """Knowledge base document."""
    
    __tablename__ = "knowledge_base_documents"
    
    id = Column(CompatUUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(CompatUUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Document data
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    document_type = Column(String(100), nullable=True)  # FAQ, Sales Script, Product Info, etc.
    status = Column(String(50), default="ready", nullable=False)  # processing, ready, error
    
    # Metadata
    word_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="knowledge_base_documents")


