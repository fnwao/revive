"""Knowledge base service for managing documents."""
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.knowledge_base import KnowledgeBaseDocument
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def create_document_from_chat(
    db: Session,
    user: User,
    content: str,
    title: str,
    document_type: str = "Other"
) -> KnowledgeBaseDocument:
    """
    Create a knowledge base document from chat content.
    
    Args:
        db: Database session
        user: User creating the document
        content: Document content (markdown)
        title: Document title
        document_type: Type of document (FAQ, Sales Script, etc.)
    
    Returns:
        Created KnowledgeBaseDocument
    """
    # Calculate word count
    word_count = len(content.split()) if content else 0
    
    # Create document
    document = KnowledgeBaseDocument(
        id=uuid.uuid4(),
        user_id=user.id,
        title=title,
        content=content,
        document_type=document_type,
        status="ready",
        word_count=word_count,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    logger.info(f"Created knowledge base document: {document.id} for user {user.id}")
    
    return document


