"""Knowledge base API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.knowledge_base import ChatRequest, ChatResponse
from app.services.ai import AIService
from app.services.knowledge_base import create_document_from_chat
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_knowledge_base(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the knowledge base to update it.
    
    Users can describe information they want to add, and the AI will:
    1. Understand the intent
    2. Create structured documents
    3. Add them to the knowledge base
    """
    try:
        ai_service = AIService()
        
        # Process the chat message and determine if a document should be created
        result = ai_service.process_knowledge_base_chat(
            message=request.message,
            conversation_history=request.conversation_history or []
        )
        
        # If AI determined a document should be created, create it
        document_created = False
        document_id = None
        if result.get("should_create_document") and result.get("document_content"):
            try:
                document = await create_document_from_chat(
                    db=db,
                    user=current_user,
                    content=result["document_content"],
                    title=result.get("document_title", "Untitled Document"),
                    document_type=result.get("document_type", "Other")
                )
                document_created = True
                document_id = str(document.id)
                logger.info(f"Created document from chat: {document.id} for user {current_user.id}")
            except Exception as e:
                logger.error(f"Error creating document from chat: {str(e)}", exc_info=True)
                # Continue with response even if document creation fails
        
        return ChatResponse(
            response=result.get("response", "I've processed your message."),
            document_created=document_created,
            document_id=document_id
        )
        
    except Exception as e:
        logger.error(f"Error processing knowledge base chat: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )

