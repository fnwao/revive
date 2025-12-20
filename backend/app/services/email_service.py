"""Email service for sending emails via GoHighLevel."""
from typing import Optional, Dict, Any
from app.services.ghl import get_ghl_service
from app.models.user import User
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""
    
    @staticmethod
    async def send_email(
        user: User,
        contact_id: str,
        subject: str,
        body: str,
        deal_id: Optional[str] = None
    ) -> bool:
        """
        Send an email via GoHighLevel.
        
        Args:
            user: User sending the email
            contact_id: GHL contact ID
            subject: Email subject
            body: Email body (HTML or plain text)
            deal_id: Optional deal ID for context
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            ghl_service = get_ghl_service(user)
            
            # Send email via GHL API
            result = await ghl_service.send_email(
                contact_id=contact_id,
                subject=subject,
                body=body,
                deal_id=deal_id
            )
            
            if result:
                logger.info(f"Email sent to contact {contact_id} for deal {deal_id}")
                return True
            else:
                logger.error(f"Failed to send email to contact {contact_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    async def get_email_conversations(
        user: User,
        deal_id: str,
        limit: int = 20
    ) -> list[Dict[str, Any]]:
        """
        Get email conversation history for a deal.
        
        Args:
            user: User
            deal_id: GHL deal ID
            limit: Maximum number of emails to return
        
        Returns:
            List of email messages
        """
        try:
            ghl_service = get_ghl_service(user)
            emails = await ghl_service.get_deal_emails(deal_id, limit=limit)
            return emails
        except Exception as e:
            logger.error(f"Error fetching emails: {str(e)}", exc_info=True)
            return []

