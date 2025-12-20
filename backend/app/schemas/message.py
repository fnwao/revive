"""Message-related Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GenerateMessageResponse(BaseModel):
    """Response schema for message generation."""
    approval_id: str
    deal_id: str
    generated_message: str  # First message for backward compatibility
    generated_messages: Optional[List[str]] = None  # Full message sequence (3-4 messages)
    message_sequence: Optional[List[dict]] = None  # Sequence with delays
    status: str = "pending"
    created_at: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "approval_id": "550e8400-e29b-41d4-a716-446655440000",
                "deal_id": "deal-001",
                "generated_message": "Hi! Wanted to follow up on our conversation. Are you still interested in moving forward?",
                "status": "pending",
                "created_at": "2024-01-11T00:00:00Z"
            }
        }

