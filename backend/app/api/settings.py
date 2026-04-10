"""Settings API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdate, UserSettingsCreate
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


def get_or_create_user_settings(user: User, db: Session) -> UserSettings:
    """Get existing user settings or create default ones."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    
    if not settings:
        # Create default settings
        settings = UserSettings(
            user_id=user.id,
            auto_detect_stalled=True,
            stalled_threshold_days=7,
            require_approval=True,
            auto_approve=False,
            email_notifications=True,
            sms_notifications=False,
            notify_on_stalled=True,
            notify_on_response=True,
            ghl_connected=False,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
        logger.info(f"Created default settings for user {user.id}")
    
    return settings


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's settings."""
    settings = get_or_create_user_settings(user, db)
    
    # Extract reactivation rules from extra_settings JSON
    reactivation_rules = None
    if settings.extra_settings and "reactivation_rules" in settings.extra_settings:
        reactivation_rules = settings.extra_settings["reactivation_rules"]
    
    # Automatically sync ghl_connected flag based on actual credentials
    # This ensures the flag is always accurate
    actual_ghl_connected = bool(user.ghl_access_token and user.ghl_location_id)
    if settings.ghl_connected != actual_ghl_connected:
        settings.ghl_connected = actual_ghl_connected
        db.commit()
        db.refresh(settings)
    
    # Map to response schema
    response_data = {
        "id": settings.id,
        "user_id": settings.user_id,
        "auto_detect_stalled": settings.auto_detect_stalled,
        "stalled_threshold_days": settings.stalled_threshold_days,
        "require_approval": settings.require_approval,
        "auto_approve": settings.auto_approve,
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "notify_on_stalled": settings.notify_on_stalled,
        "notify_on_response": settings.notify_on_response,
        "ghl_connected": settings.ghl_connected,
        "ghl_api_key": user.ghl_access_token,  # Get from user model (used by GHL service)
        "ghl_location_id": user.ghl_location_id,  # Get from user model
        "reactivation_rules": reactivation_rules,
        "created_at": settings.created_at.isoformat() if settings.created_at else None,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }
    
    return response_data


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    settings_update: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's settings."""
    settings = get_or_create_user_settings(user, db)
    
    # Update fields that are provided
    update_data = settings_update.model_dump(exclude_unset=True)
    
    # Handle reactivation_rules separately (store in extra_settings JSON)
    reactivation_rules = update_data.pop("reactivation_rules", None)
    if reactivation_rules is not None:
        if settings.extra_settings is None:
            settings.extra_settings = {}
        settings.extra_settings["reactivation_rules"] = reactivation_rules
    
    # Handle GHL credentials separately (they're on the User model)
    ghl_location_id = update_data.pop("ghl_location_id", None)
    if ghl_location_id is not None:
        user.ghl_location_id = ghl_location_id
    
    # Handle GHL API key - save to user.ghl_access_token for GHL service
    ghl_api_key = update_data.pop("ghl_api_key", None)
    if ghl_api_key is not None:
        user.ghl_access_token = ghl_api_key
    
    # Automatically update ghl_connected flag based on whether credentials are present
    # Check both the updated values and existing values
    final_access_token = user.ghl_access_token if ghl_api_key is None else (ghl_api_key if ghl_api_key else None)
    final_location_id = user.ghl_location_id if ghl_location_id is None else (ghl_location_id if ghl_location_id else None)
    
    # Set ghl_connected to True if both credentials are present, False otherwise
    settings.ghl_connected = bool(final_access_token and final_location_id)
    
    # Update settings fields
    for key, value in update_data.items():
        if hasattr(settings, key) and value is not None:
            setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    db.refresh(user)
    
    logger.info(f"Updated settings for user {user.id}")
    
    # Extract reactivation rules from extra_settings JSON
    reactivation_rules = None
    if settings.extra_settings and "reactivation_rules" in settings.extra_settings:
        reactivation_rules = settings.extra_settings["reactivation_rules"]
    
    # Return updated settings
    response_data = {
        "id": settings.id,
        "user_id": settings.user_id,
        "auto_detect_stalled": settings.auto_detect_stalled,
        "stalled_threshold_days": settings.stalled_threshold_days,
        "require_approval": settings.require_approval,
        "auto_approve": settings.auto_approve,
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "notify_on_stalled": settings.notify_on_stalled,
        "notify_on_response": settings.notify_on_response,
        "ghl_connected": settings.ghl_connected,
        "ghl_api_key": user.ghl_access_token,  # Get from user model (used by GHL service)
        "ghl_location_id": user.ghl_location_id,
        "reactivation_rules": reactivation_rules,
        "created_at": settings.created_at.isoformat() if settings.created_at else None,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }
    
    return response_data


