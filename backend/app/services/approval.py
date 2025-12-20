"""Approval service for managing message approvals."""
from sqlalchemy.orm import Session
from app.models.approval_queue import ApprovalQueue, ApprovalStatus
from app.models.deal import Deal
from app.models.user import User
from app.services.ghl import get_ghl_service
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService, NotificationType
from app.services.webhook_service import WebhookService
from app.models.webhook import WebhookEvent
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def send_approved_message(
    db: Session,
    approval: ApprovalQueue,
    user: User,
    edited_message: str = None
) -> bool:
    """
    Send an approved message via GHL.
    
    Args:
        db: Database session
        approval: Approval queue item
        user: User who owns the approval
        edited_message: Optional edited message (if provided, uses this instead)
    
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        # Determine which message to send
        message_to_send = edited_message or approval.edited_message or approval.generated_message
        
        if not message_to_send:
            logger.error(f"Approval {approval.id} has no message to send")
            return False
        
        # Get deal to find contact_id
        deal = db.query(Deal).filter(Deal.id == approval.deal_id).first()
        if not deal:
            logger.error(f"Deal not found for approval {approval.id}")
            return False
        
        contact_id = approval.ghl_contact_id or deal.ghl_contact_id
        if not contact_id:
            logger.error(f"No contact ID for approval {approval.id}")
            return False
        
        # Determine channel (default to SMS, but check approval.channel if set)
        channel = approval.channel or "sms"
        success = False
        
        # Get GHL service
        ghl_service = get_ghl_service(user)
        
        # Send via appropriate channel
        if channel == "email" or channel == "both":
            # Send email
            email_subject = approval.email_subject or f"Follow-up on {deal.title or 'your deal'}"
            email_success = await EmailService.send_email(
                user=user,
                contact_id=contact_id,
                subject=email_subject,
                body=message_to_send,
                deal_id=approval.ghl_deal_id
            )
            if channel == "email":
                success = email_success
            elif channel == "both":
                # Also send SMS
                sms_success = await ghl_service.send_sms(contact_id, message_to_send)
                success = email_success and sms_success
        else:
            # Send SMS
            success = await ghl_service.send_sms(contact_id, message_to_send)
        
        if success:
            # Update approval status
            approval.status = ApprovalStatus.SENT
            approval.final_message = message_to_send
            approval.sent_at = datetime.now()
            db.commit()
            
            # Create notification
            NotificationService.create_notification(
                db=db,
                user_id=str(user.id),
                notification_type=NotificationType.MESSAGE_SENT,
                title="Message Sent",
                message=f"Your reactivation message for {deal.title or 'deal'} has been sent successfully.",
                data={"approval_id": str(approval.id), "deal_id": approval.ghl_deal_id}
            )
            
            # Trigger webhook
            await WebhookService.trigger_webhooks_for_event(
                db=db,
                user_id=str(user.id),
                event_type=WebhookEvent.MESSAGE_SENT,
                payload={
                    "approval_id": str(approval.id),
                    "deal_id": approval.ghl_deal_id,
                    "message": message_to_send,
                    "channel": channel,
                    "sent_at": approval.sent_at.isoformat()
                }
            )
            
            logger.info(f"Message sent successfully for approval {approval.id}")
            return True
        else:
            logger.error(f"Failed to send message for approval {approval.id}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}", exc_info=True)
        return False

