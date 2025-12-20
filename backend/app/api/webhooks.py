"""Webhook API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.webhook import Webhook, WebhookDelivery, WebhookEvent, WebhookStatus
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class WebhookCreateRequest(BaseModel):
    """Request to create a webhook."""
    name: str = Field(..., min_length=1, max_length=255)
    url: HttpUrl
    secret: Optional[str] = None
    events: List[str] = Field(..., min_items=1)
    retry_count: int = Field(default=3, ge=1, le=10)
    timeout_seconds: int = Field(default=30, ge=5, le=120)


class WebhookUpdateRequest(BaseModel):
    """Request to update a webhook."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[HttpUrl] = None
    secret: Optional[str] = None
    events: Optional[List[str]] = None
    status: Optional[str] = None
    retry_count: Optional[int] = Field(None, ge=1, le=10)
    timeout_seconds: Optional[int] = Field(None, ge=5, le=120)


class WebhookResponse(BaseModel):
    """Webhook response schema."""
    id: str
    name: str
    url: str
    events: List[str]
    status: str
    retry_count: int
    timeout_seconds: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    last_triggered_at: Optional[datetime]
    last_success_at: Optional[datetime]
    last_failure_at: Optional[datetime]
    created_at: datetime


class WebhookDeliveryResponse(BaseModel):
    """Webhook delivery response schema."""
    id: str
    event_type: str
    status: str
    response_status: Optional[int]
    attempts: int
    error_message: Optional[str]
    triggered_at: datetime
    delivered_at: Optional[datetime]


class WebhookListResponse(BaseModel):
    """List of webhooks."""
    webhooks: List[WebhookResponse]
    total: int


@router.get("", response_model=WebhookListResponse)
async def list_webhooks(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List webhooks for the current user."""
    try:
        query = db.query(Webhook).filter(Webhook.user_id == current_user.id)
        
        if status_filter:
            query = query.filter(Webhook.status == status_filter)
        
        webhooks = query.order_by(desc(Webhook.created_at)).all()
        
        return WebhookListResponse(
            webhooks=[
                WebhookResponse(
                    id=str(w.id),
                    name=w.name,
                    url=w.url,
                    events=w.events or [],
                    status=w.status,
                    retry_count=w.retry_count,
                    timeout_seconds=w.timeout_seconds,
                    total_requests=w.total_requests,
                    successful_requests=w.successful_requests,
                    failed_requests=w.failed_requests,
                    last_triggered_at=w.last_triggered_at,
                    last_success_at=w.last_success_at,
                    last_failure_at=w.last_failure_at,
                    created_at=w.created_at
                )
                for w in webhooks
            ],
            total=len(webhooks)
        )
    except Exception as e:
        logger.error(f"Error listing webhooks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing webhooks: {str(e)}"
        )


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    request: WebhookCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new webhook."""
    try:
        # Validate event types
        valid_events = [e.value for e in WebhookEvent]
        for event in request.events:
            if event not in valid_events:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid event type: {event}. Valid events: {valid_events}"
                )
        
        webhook = Webhook(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=request.name,
            url=str(request.url),
            secret=request.secret,
            events=request.events,
            status=WebhookStatus.ACTIVE.value,
            retry_count=request.retry_count,
            timeout_seconds=request.timeout_seconds
        )
        
        db.add(webhook)
        db.commit()
        db.refresh(webhook)
        
        logger.info(f"Created webhook {webhook.id} for user {current_user.id}")
        
        return WebhookResponse(
            id=str(webhook.id),
            name=webhook.name,
            url=webhook.url,
            events=webhook.events or [],
            status=webhook.status,
            retry_count=webhook.retry_count,
            timeout_seconds=webhook.timeout_seconds,
            total_requests=webhook.total_requests,
            successful_requests=webhook.successful_requests,
            failed_requests=webhook.failed_requests,
            last_triggered_at=webhook.last_triggered_at,
            last_success_at=webhook.last_success_at,
            last_failure_at=webhook.last_failure_at,
            created_at=webhook.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating webhook: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating webhook: {str(e)}"
        )


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific webhook."""
    webhook = db.query(Webhook).filter(
        and_(
            Webhook.id == webhook_id,
            Webhook.user_id == current_user.id
        )
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    return WebhookResponse(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        events=webhook.events or [],
        status=webhook.status,
        retry_count=webhook.retry_count,
        timeout_seconds=webhook.timeout_seconds,
        total_requests=webhook.total_requests,
        successful_requests=webhook.successful_requests,
        failed_requests=webhook.failed_requests,
        last_triggered_at=webhook.last_triggered_at,
        last_success_at=webhook.last_success_at,
        last_failure_at=webhook.last_failure_at,
        created_at=webhook.created_at
    )


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    request: WebhookUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a webhook."""
    webhook = db.query(Webhook).filter(
        and_(
            Webhook.id == webhook_id,
            Webhook.user_id == current_user.id
        )
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Update fields
    if request.name is not None:
        webhook.name = request.name
    if request.url is not None:
        webhook.url = str(request.url)
    if request.secret is not None:
        webhook.secret = request.secret
    if request.events is not None:
        # Validate event types
        valid_events = [e.value for e in WebhookEvent]
        for event in request.events:
            if event not in valid_events:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid event type: {event}"
                )
        webhook.events = request.events
    if request.status is not None:
        webhook.status = request.status
    if request.retry_count is not None:
        webhook.retry_count = request.retry_count
    if request.timeout_seconds is not None:
        webhook.timeout_seconds = request.timeout_seconds
    
    db.commit()
    db.refresh(webhook)
    
    return WebhookResponse(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        events=webhook.events or [],
        status=webhook.status,
        retry_count=webhook.retry_count,
        timeout_seconds=webhook.timeout_seconds,
        total_requests=webhook.total_requests,
        successful_requests=webhook.successful_requests,
        failed_requests=webhook.failed_requests,
        last_triggered_at=webhook.last_triggered_at,
        last_success_at=webhook.last_success_at,
        last_failure_at=webhook.last_failure_at,
        created_at=webhook.created_at
    )


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a webhook."""
    webhook = db.query(Webhook).filter(
        and_(
            Webhook.id == webhook_id,
            Webhook.user_id == current_user.id
        )
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    db.delete(webhook)
    db.commit()
    
    return {"success": True}


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def list_webhook_deliveries(
    webhook_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List webhook delivery history."""
    # Verify webhook belongs to user
    webhook = db.query(Webhook).filter(
        and_(
            Webhook.id == webhook_id,
            Webhook.user_id == current_user.id
        )
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    query = db.query(WebhookDelivery).filter(
        WebhookDelivery.webhook_id == webhook_id
    )
    
    if status_filter:
        query = query.filter(WebhookDelivery.status == status_filter)
    
    deliveries = query.order_by(desc(WebhookDelivery.triggered_at)).offset(offset).limit(limit).all()
    
    return [
        WebhookDeliveryResponse(
            id=str(d.id),
            event_type=d.event_type,
            status=d.status,
            response_status=d.response_status,
            attempts=d.attempts,
            error_message=d.error_message,
            triggered_at=d.triggered_at,
            delivered_at=d.delivered_at
        )
        for d in deliveries
    ]
