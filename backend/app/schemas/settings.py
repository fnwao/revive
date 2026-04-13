"""Settings schemas for request/response validation."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID


class ReactivationRule(BaseModel):
    """Schema for a reactivation rule."""
    id: str
    name: str
    enabled: bool
    statuses: List[str] = []
    tags: List[str] = []
    thresholdDays: int = Field(ge=1, le=90)
    priority: int = 1


class UserSettingsBase(BaseModel):
    """Base settings schema."""
    auto_detect_stalled: bool = True
    stalled_threshold_days: int = Field(default=7, ge=1, le=90)
    require_approval: bool = True
    auto_approve: bool = False
    email_notifications: bool = True
    sms_notifications: bool = False
    notify_on_stalled: bool = True
    notify_on_response: bool = True
    ghl_connected: bool = False
    ghl_api_key: Optional[str] = None
    ghl_location_id: Optional[str] = None
    reactivation_rules: Optional[List[ReactivationRule]] = None
    
    @field_validator("stalled_threshold_days")
    @classmethod
    def validate_threshold(cls, v):
        if v < 1 or v > 90:
            raise ValueError("Threshold must be between 1 and 90 days")
        return v


class UserSettingsCreate(UserSettingsBase):
    """Schema for creating user settings."""
    pass


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings (all fields optional)."""
    auto_detect_stalled: Optional[bool] = None
    stalled_threshold_days: Optional[int] = Field(default=None, ge=1, le=90)
    require_approval: Optional[bool] = None
    auto_approve: Optional[bool] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    notify_on_stalled: Optional[bool] = None
    notify_on_response: Optional[bool] = None
    ghl_connected: Optional[bool] = None
    ghl_api_key: Optional[str] = None
    ghl_location_id: Optional[str] = None
    reactivation_rules: Optional[List[ReactivationRule]] = None
    fireflies_api_key: Optional[str] = None
    fathom_api_key: Optional[str] = None


class UserSettingsResponse(UserSettingsBase):
    """Schema for user settings response."""
    id: UUID
    user_id: UUID
    fireflies_connected: bool = False
    fathom_connected: bool = False
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


