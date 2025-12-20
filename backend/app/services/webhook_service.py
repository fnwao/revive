"""Webhook service for delivering webhook events."""
import httpx
import hmac
import hashlib
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.webhook import Webhook, WebhookDelivery, WebhookEvent, WebhookStatus
from app.models.user import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for managing webhook deliveries."""
    
    @staticmethod
    async def trigger_webhook(
        db: Session,
        webhook: Webhook,
        event_type: WebhookEvent,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Trigger a webhook delivery.
        
        Args:
            db: Database session
            webhook: Webhook configuration
            event_type: Type of event
            payload: Event payload
        
        Returns:
            True if delivered successfully, False otherwise
        """
        if webhook.status != WebhookStatus.ACTIVE.value:
            logger.warning(f"Webhook {webhook.id} is not active")
            return False
        
        # Create delivery record
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event_type=event_type.value,
            payload=payload,
            status="pending"
        )
        db.add(delivery)
        db.commit()
        
        # Prepare request
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Revive.ai-Webhook/1.0"
        }
        
        # Add signature if secret is configured
        if webhook.secret:
            signature = WebhookService._generate_signature(
                webhook.secret,
                json.dumps(payload, sort_keys=True)
            )
            headers["X-Revive-Signature"] = signature
        
        # Add event type header
        headers["X-Revive-Event"] = event_type.value
        
        # Send webhook
        success = False
        error_message = None
        response_status = None
        response_body = None
        
        try:
            async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
                response = await client.post(
                    webhook.url,
                    json=payload,
                    headers=headers
                )
                
                response_status = response.status_code
                response_body = response.text[:1000]  # Limit response body size
                
                if 200 <= response_status < 300:
                    success = True
                    delivery.status = "success"
                    delivery.delivered_at = datetime.now()
                    webhook.successful_requests += 1
                    webhook.last_success_at = datetime.now()
                else:
                    error_message = f"HTTP {response_status}: {response_body}"
                    delivery.status = "failed"
                    delivery.error_message = error_message
                    webhook.failed_requests += 1
                    webhook.last_failure_at = datetime.now()
                    webhook.last_error = error_message
                    
        except httpx.TimeoutException:
            error_message = f"Request timeout after {webhook.timeout_seconds}s"
            delivery.status = "failed"
            delivery.error_message = error_message
            webhook.failed_requests += 1
            webhook.last_failure_at = datetime.now()
            webhook.last_error = error_message
            
        except Exception as e:
            error_message = str(e)
            delivery.status = "failed"
            delivery.error_message = error_message
            webhook.failed_requests += 1
            webhook.last_failure_at = datetime.now()
            webhook.last_error = error_message
        
        # Update delivery and webhook
        delivery.response_status = response_status
        delivery.response_body = response_body
        delivery.attempts = 1
        webhook.total_requests += 1
        webhook.last_triggered_at = datetime.now()
        
        db.commit()
        
        if success:
            logger.info(f"Webhook {webhook.id} delivered successfully")
        else:
            logger.warning(f"Webhook {webhook.id} delivery failed: {error_message}")
        
        return success
    
    @staticmethod
    async def trigger_webhooks_for_event(
        db: Session,
        user_id: str,
        event_type: WebhookEvent,
        payload: Dict[str, Any],
        team_id: str = None
    ) -> int:
        """
        Trigger all active webhooks for a user/team for a specific event.
        
        Args:
            db: Database session
            user_id: User ID
            event_type: Event type
            payload: Event payload
            team_id: Optional team ID
        
        Returns:
            Number of webhooks triggered
        """
        # Find active webhooks subscribed to this event
        query = db.query(Webhook).filter(
            Webhook.status == WebhookStatus.ACTIVE.value
        )
        
        if team_id:
            query = query.filter(Webhook.team_id == team_id)
        else:
            query = query.filter(Webhook.user_id == user_id)
        
        webhooks = query.all()
        
        # Filter webhooks that subscribe to this event
        subscribed_webhooks = [
            w for w in webhooks
            if event_type.value in (w.events or [])
        ]
        
        # Trigger each webhook
        success_count = 0
        for webhook in subscribed_webhooks:
            success = await WebhookService.trigger_webhook(
                db=db,
                webhook=webhook,
                event_type=event_type,
                payload=payload
            )
            if success:
                success_count += 1
        
        return success_count
    
    @staticmethod
    def _generate_signature(secret: str, payload: str) -> str:
        """Generate HMAC signature for webhook payload."""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_signature(secret: str, payload: str, signature: str) -> bool:
        """Verify webhook signature."""
        expected_signature = WebhookService._generate_signature(secret, payload)
        return hmac.compare_digest(expected_signature, signature)


