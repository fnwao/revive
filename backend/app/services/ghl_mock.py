"""Mock GoHighLevel service for testing without real API access."""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.deal import Deal
import random
import logging

logger = logging.getLogger(__name__)


class GHLMockService:
    """Mock GHL service that returns realistic fake data."""
    
    # Mock deal data
    MOCK_DEALS = [
        {
            "id": "deal-001",
            "dealId": "deal-001",
            "title": "Sarah Johnson - Real Estate Mastery Program",
            "contactId": "contact-001",
            "pipelineId": "pipeline-001",
            "status": "active",
            "monetaryValue": 5000.00,
            "lastActivityDate": (datetime.now() - timedelta(days=10)).isoformat() + "Z",  # Stalled
        },
        {
            "id": "deal-002",
            "dealId": "deal-002",
            "title": "Mike Chen - Real Estate Mastery Program",
            "contactId": "contact-002",
            "pipelineId": "pipeline-001",
            "status": "active",
            "monetaryValue": 2000.00,
            "lastActivityDate": (datetime.now() - timedelta(days=3)).isoformat() + "Z",  # Active
        },
        {
            "id": "deal-003",
            "dealId": "deal-003",
            "title": "Jennifer Martinez - Real Estate Mastery Program",
            "contactId": "contact-003",
            "pipelineId": "pipeline-001",
            "status": "active",
            "monetaryValue": 10000.00,
            "lastActivityDate": (datetime.now() - timedelta(days=12)).isoformat() + "Z",  # Stalled
        },
        {
            "id": "deal-004",
            "dealId": "deal-004",
            "title": "David Park - Real Estate Mastery Program",
            "contactId": "contact-004",
            "pipelineId": "pipeline-002",
            "status": "active",
            "monetaryValue": 1000.00,
            "lastActivityDate": (datetime.now() - timedelta(days=1)).isoformat() + "Z",  # Active
        },
        {
            "id": "deal-005",
            "dealId": "deal-005",
            "title": "Lisa Thompson - Real Estate Mastery Program",
            "contactId": "contact-005",
            "pipelineId": "pipeline-001",
            "status": "active",
            "monetaryValue": 25000.00,
            "lastActivityDate": (datetime.now() - timedelta(days=8)).isoformat() + "Z",  # Stalled
        },
    ]
    
    # Mock conversation templates
    CONVERSATION_TEMPLATES = [
        {
            "direction": "outbound",
            "content": "Hi! Thanks for your interest in our services. I'd love to schedule a quick call to discuss how we can help your business grow.",
        },
        {
            "direction": "inbound",
            "content": "Yes, I'm interested. When would be a good time?",
        },
        {
            "direction": "outbound",
            "content": "How about tomorrow at 2pm? Does that work for you?",
        },
        {
            "direction": "inbound",
            "content": "That works! Looking forward to it.",
        },
        {
            "direction": "outbound",
            "content": "Great! I'll send you a calendar invite. Talk soon!",
        },
        {
            "direction": "outbound",
            "content": "Hi! Just following up on our conversation. Are you still interested in moving forward?",
        },
        {
            "direction": "inbound",
            "content": "Yes, but I need to check with my team first. Can I get back to you next week?",
        },
        {
            "direction": "outbound",
            "content": "Absolutely! I'll touch base with you next week then.",
        },
        {
            "direction": "outbound",
            "content": "Hi! Wanted to see if you've had a chance to review the proposal. Happy to answer any questions!",
        },
    ]
    
    def __init__(self, user: User):
        """Initialize mock service."""
        self.user = user
        logger.info("Using MOCK GHL service - no real API calls will be made")
    
    async def get_deal(self, deal_id: str) -> Optional[Dict[str, Any]]:
        """Fetch deal details from mock data."""
        logger.info(f"[MOCK] Fetching deal: {deal_id}")
        
        # Simulate API delay
        import asyncio
        await asyncio.sleep(0.1)
        
        # Find deal in mock data
        for deal in self.MOCK_DEALS:
            if deal["id"] == deal_id or deal["dealId"] == deal_id:
                return deal.copy()
        
        # If not found, return None (like real API would)
        logger.warning(f"[MOCK] Deal not found: {deal_id}")
        return None
    
    async def get_deals_by_pipeline(self, pipeline_id: str) -> List[Dict[str, Any]]:
        """Fetch all deals in a pipeline."""
        logger.info(f"[MOCK] Fetching deals for pipeline: {pipeline_id}")
        
        import asyncio
        await asyncio.sleep(0.1)
        
        deals = [
            deal.copy() for deal in self.MOCK_DEALS
            if deal.get("pipelineId") == pipeline_id
        ]
        
        return deals
    
    async def get_deal_conversations(
        self, 
        deal_id: str, 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Fetch conversation history for a deal."""
        logger.info(f"[MOCK] Fetching conversations for deal: {deal_id}, limit: {limit}")
        
        import asyncio
        await asyncio.sleep(0.1)
        
        # Get deal to find contact_id
        deal = await self.get_deal(deal_id)
        if not deal:
            return []
        
        contact_id = deal.get("contactId", "contact-unknown")
        
        # Generate realistic conversation history
        # Mix of templates, with timestamps spread over last 30 days
        conversations = []
        base_date = datetime.now() - timedelta(days=30)
        
        # Use 5-15 messages per deal (random)
        num_messages = random.randint(5, min(15, limit))
        
        for i in range(num_messages):
            template = random.choice(self.CONVERSATION_TEMPLATES)
            
            # Spread messages over time (more recent = more messages)
            days_ago = random.randint(0, 30)
            message_date = base_date + timedelta(days=days_ago, hours=random.randint(0, 23))
            
            conversation = {
                "id": f"msg-{deal_id}-{i}",
                "messageId": f"msg-{deal_id}-{i}",
                "contactId": contact_id,
                "dealId": deal_id,
                "type": "sms",
                "direction": template["direction"],
                "content": template["content"],
                "sentAt": message_date.isoformat() + "Z",
                "createdAt": message_date.isoformat() + "Z",
            }
            conversations.append(conversation)
        
        # Sort by date (newest first)
        conversations.sort(key=lambda x: x["sentAt"], reverse=True)
        
        return conversations[:limit]
    
    async def send_sms(
        self, 
        contact_id: str, 
        message: str
    ) -> bool:
        """Mock SMS sending - just logs the message."""
        logger.info(f"[MOCK] Sending SMS to contact {contact_id}: {message}")
        
        import asyncio
        await asyncio.sleep(0.1)
        
        # In mock mode, we just log it
        logger.info(f"[MOCK] ✅ SMS would be sent: {message[:50]}...")
        return True
    
    async def send_email(
        self,
        contact_id: str,
        subject: str,
        body: str,
        deal_id: Optional[str] = None
    ) -> bool:
        """Mock email sending - just logs the email."""
        logger.info(f"[MOCK] Sending email to contact {contact_id}")
        logger.info(f"[MOCK] Subject: {subject}")
        logger.info(f"[MOCK] Body: {body[:100]}...")
        
        import asyncio
        await asyncio.sleep(0.1)
        
        logger.info(f"[MOCK] ✅ Email would be sent")
        return True
    
    async def get_deal_emails(
        self,
        deal_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Mock email fetching - returns empty list."""
        logger.info(f"[MOCK] Fetching emails for deal {deal_id}")
        return []
    
    def sync_deal_to_db(self, db: Session, ghl_deal_data: Dict[str, Any]) -> Deal:
        """Sync deal data from mock GHL to local database."""
        from app.models.deal import Deal
        
        ghl_deal_id = ghl_deal_data.get("id") or ghl_deal_data.get("dealId")
        
        # Find or create deal
        deal = db.query(Deal).filter(Deal.ghl_deal_id == ghl_deal_id).first()
        
        if not deal:
            deal = Deal(
                user_id=self.user.id,
                ghl_deal_id=ghl_deal_id
            )
            db.add(deal)
        
        # Update deal fields
        deal.ghl_contact_id = ghl_deal_data.get("contactId")
        deal.ghl_pipeline_id = ghl_deal_data.get("pipelineId")
        deal.title = ghl_deal_data.get("title")
        deal.status = ghl_deal_data.get("status")
        deal.value = ghl_deal_data.get("monetaryValue")
        
        # Parse dates
        if ghl_deal_data.get("lastActivityDate"):
            last_activity = ghl_deal_data["lastActivityDate"]
            if isinstance(last_activity, str):
                # Remove Z and parse
                last_activity = last_activity.replace("Z", "+00:00")
                deal.last_activity_date = datetime.fromisoformat(last_activity)
            else:
                deal.last_activity_date = last_activity
        
        db.commit()
        db.refresh(deal)
        return deal

