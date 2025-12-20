"""Knowledge base Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ChatMessage(BaseModel):
    """Schema for a chat message in conversation history."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request schema for knowledge base chat."""
    message: str = Field(..., description="User's chat message")
    conversation_history: Optional[List[ChatMessage]] = Field(
        None,
        description="Previous messages in the conversation"
    )


class ChatResponse(BaseModel):
    """Response schema for knowledge base chat."""
    response: str = Field(..., description="AI's response message")
    document_created: bool = Field(False, description="Whether a document was created")
    document_id: Optional[str] = Field(None, description="ID of created document if any")


