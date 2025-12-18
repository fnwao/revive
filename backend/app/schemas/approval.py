"""Approval queue Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.approval_queue import ApprovalStatus


class ApprovalItem(BaseModel):
    """Schema for a single approval queue item."""
    id: str
    deal_id: str
    ghl_deal_id: str
    deal_title: Optional[str] = None
    generated_message: str
    edited_message: Optional[str] = None
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "deal_id": "deal-001",
                "ghl_deal_id": "deal-001",
                "deal_title": "Acme Corp - Enterprise Package",
                "generated_message": "Hi! Wanted to follow up...",
                "edited_message": None,
                "status": "pending",
                "created_at": "2024-01-11T00:00:00Z",
                "approved_at": None,
                "sent_at": None
            }
        }


class ApprovalListResponse(BaseModel):
    """Response schema for listing approvals."""
    approvals: List[ApprovalItem]
    total: int
    pending: int
    approved: int
    rejected: int
    sent: int


class ApproveRequest(BaseModel):
    """Request schema for approving a message."""
    pass  # No additional fields needed for approve


class RejectRequest(BaseModel):
    """Request schema for rejecting a message."""
    pass  # No additional fields needed for reject


class SendRequest(BaseModel):
    """Request schema for sending a message (with optional edits)."""
    edited_message: Optional[str] = Field(
        None,
        description="Optional edited version of the message. If not provided, uses generated_message or edited_message"
    )


class ApprovalActionResponse(BaseModel):
    """Response schema for approval actions."""
    id: str
    status: str
    message: str
    sent: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "sent",
                "message": "Message sent successfully",
                "sent": True
            }
        }

