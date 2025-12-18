"""Webhook schemas."""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class WebhookEvent(BaseModel):
    """Base webhook event from GoHighLevel."""
    event: str
    timestamp: datetime
    data: Dict[str, Any]


class DealUpdateEvent(BaseModel):
    """Deal update webhook event."""
    deal_id: str
    contact_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None
    last_activity_date: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

