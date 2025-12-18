"""Webhook endpoints for GoHighLevel."""
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.webhook import WebhookEvent, DealUpdateEvent
from app.core.auth import get_current_user
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/ghl")
async def ghl_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receive webhooks from GoHighLevel.
    
    This endpoint:
    1. Validates the webhook signature (TODO: implement)
    2. Parses the event
    3. Enqueues background job for processing
    4. Returns 200 immediately
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        # TODO: Verify webhook signature
        # signature = request.headers.get("X-GHL-Signature")
        # if not verify_signature(body, signature):
        #     raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse webhook payload
        payload = await request.json()
        event = WebhookEvent(**payload)
        
        logger.info(f"Received GHL webhook: {event.event}")
        
        # Handle different event types
        if event.event == "deal.updated":
            deal_data = DealUpdateEvent(**event.data)
            
            # Enqueue background job for async processing
            # For now, use FastAPI BackgroundTasks (upgrade to Celery later)
            background_tasks.add_task(
                process_deal_update_task,
                deal_id=deal_data.deal_id,
                event_data=deal_data.dict()
            )
            
        elif event.event == "deal.created":
            # Handle new deal creation
            logger.info(f"New deal created: {event.data.get('deal_id')}")
            
        elif event.event == "message.received":
            # Handle new message
            logger.info(f"New message received: {event.data.get('message_id')}")
            
        else:
            logger.info(f"Unhandled event type: {event.event}")
        
        # Always return 200 immediately (fire-and-forget)
        return {"status": "ok", "message": "Webhook received"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        # Still return 200 to GHL (don't retry bad requests)
        return {"status": "error", "message": str(e)}


def process_deal_update_task(deal_id: str, event_data: dict):
    """
    Background task to process deal update.
    
    This will be replaced with Celery task in production.
    Note: FastAPI BackgroundTasks runs sync functions, not async.
    """
    # Import here to avoid circular imports
    from app.db.session import SessionLocal
    from app.workers.tasks import process_deal_update
    
    db = SessionLocal()
    try:
        # Extract user_id from event_data if available
        # TODO: Get user_id from deal lookup or event metadata
        user_id = event_data.get("user_id")
        
        # Call the Celery task function directly (sync version)
        # In production, this would be: process_deal_update.delay(deal_id, event_data, user_id)
        process_deal_update(deal_id, event_data, user_id)
    finally:
        db.close()

