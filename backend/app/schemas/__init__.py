"""Pydantic schemas."""
from app.schemas.webhook import WebhookEvent, DealUpdateEvent
from app.schemas.deal import DetectStalledRequest, DetectStalledResponse, StalledDeal
from app.schemas.message import GenerateMessageResponse
from app.schemas.approval import (
    ApprovalListResponse,
    ApprovalItem,
    ApproveRequest,
    RejectRequest,
    SendRequest,
    ApprovalActionResponse
)

__all__ = [
    "WebhookEvent", 
    "DealUpdateEvent",
    "DetectStalledRequest",
    "DetectStalledResponse", 
    "StalledDeal",
    "GenerateMessageResponse",
    "ApprovalListResponse",
    "ApprovalItem",
    "ApproveRequest",
    "RejectRequest",
    "SendRequest",
    "ApprovalActionResponse"
]

