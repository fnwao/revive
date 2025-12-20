"""Deal-related Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DetectStalledRequest(BaseModel):
    """Request schema for detecting stalled deals."""
    pipeline_id: Optional[str] = Field(None, description="Pipeline ID to check all deals in pipeline")
    deal_ids: Optional[List[str]] = Field(None, description="Specific deal IDs to check")
    stalled_threshold_days: int = Field(7, ge=1, le=90, description="Days of inactivity to consider stalled")
    status_filter: Optional[List[str]] = Field(None, description="Filter by opportunity status (e.g., ['active', 'won'])")
    tags_filter: Optional[List[str]] = Field(None, description="Filter by GHL tags (deals must have at least one of these tags)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pipeline_id": "pipeline-001",
                "stalled_threshold_days": 7
            }
        }


class StalledDeal(BaseModel):
    """Schema for a stalled deal."""
    deal_id: str
    title: Optional[str]
    status: Optional[str]
    value: Optional[float]
    currency: str = "USD"
    last_activity_date: Optional[datetime]
    days_since_activity: int
    contact_id: Optional[str]
    pipeline_id: Optional[str]
    tags: Optional[List[str]] = None
    # Intelligence fields
    intelligence_score: Optional[float] = None
    priority: Optional[str] = None
    insights: Optional[List[str]] = None
    recommended_action: Optional[str] = None
    response_probability: Optional[float] = None
    response_confidence: Optional[float] = None
    sentiment: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "deal_id": "deal-001",
                "title": "Acme Corp - Enterprise Package",
                "status": "active",
                "value": 5000.00,
                "currency": "USD",
                "last_activity_date": "2024-01-01T00:00:00Z",
                "days_since_activity": 10,
                "contact_id": "contact-001",
                "pipeline_id": "pipeline-001"
            }
        }


class DetectStalledResponse(BaseModel):
    """Response schema for stalled deal detection."""
    stalled_deals: List[StalledDeal]
    total_found: int
    threshold_days: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "stalled_deals": [
                    {
                        "deal_id": "deal-001",
                        "title": "Acme Corp - Enterprise Package",
                        "status": "active",
                        "value": 5000.00,
                        "days_since_activity": 10
                    }
                ],
                "total_found": 1,
                "threshold_days": 7
            }
        }

