"""GoHighLevel API integration service."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.deal import Deal
from app.models.conversation import Conversation, MessageType
from app.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)


def get_ghl_service(user: User):
    """
    Factory function to get GHL service (real or mock).
    
    Returns GHLService or GHLMockService based on config.
    """
    if settings.use_mock_ghl:
        from app.services.ghl_mock import GHLMockService
        return GHLMockService(user)
    else:
        return GHLService(user)


class GHLService:
    """Service for interacting with GoHighLevel API."""
    
    BASE_URL = "https://services.leadconnectorhq.com"
    
    def __init__(self, user: User):
        """Initialize with user's GHL credentials."""
        self.user = user
        self.access_token = user.ghl_access_token
        self.location_id = user.ghl_location_id
        
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers for GHL API requests."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Version": "2021-07-28"
        }
    
    async def get_deal(self, deal_id: str) -> Optional[Dict[str, Any]]:
        """Fetch deal details from GHL."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/opportunities/{deal_id}",
                    headers=self._get_headers()
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error fetching deal {deal_id}: {str(e)}")
                return None
    
    async def get_deals_by_pipeline(self, pipeline_id: str) -> List[Dict[str, Any]]:
        """Fetch all deals in a pipeline."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/opportunities",
                    headers=self._get_headers(),
                    params={"pipelineId": pipeline_id}
                )
                response.raise_for_status()
                data = response.json()
                return data.get("opportunities", [])
            except httpx.HTTPError as e:
                logger.error(f"Error fetching deals for pipeline {pipeline_id}: {str(e)}")
                return []
    
    async def get_deal_conversations(
        self, 
        deal_id: str, 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Fetch conversation history for a deal."""
        async with httpx.AsyncClient() as client:
            try:
                # Get contact ID from deal first
                deal = await self.get_deal(deal_id)
                if not deal or not deal.get("contactId"):
                    return []
                
                contact_id = deal["contactId"]
                
                # Fetch messages (SMS, email, calls)
                # Note: GHL API structure may vary, adjust as needed
                response = await client.get(
                    f"{self.BASE_URL}/contacts/{contact_id}/communications",
                    headers=self._get_headers(),
                    params={"limit": limit}
                )
                response.raise_for_status()
                data = response.json()
                return data.get("communications", [])
                
            except httpx.HTTPError as e:
                logger.error(f"Error fetching conversations for deal {deal_id}: {str(e)}")
                return []
    
    async def send_sms(
        self, 
        contact_id: str, 
        message: str
    ) -> bool:
        """Send SMS message via GHL."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/contacts/{contact_id}/communications/sms",
                    headers=self._get_headers(),
                    json={
                        "phone": contact_id,  # Adjust based on GHL API
                        "message": message
                    }
                )
                response.raise_for_status()
                return True
            except httpx.HTTPError as e:
                logger.error(f"Error sending SMS: {str(e)}")
                return False
    
    def sync_deal_to_db(self, db: Session, ghl_deal_data: Dict[str, Any]) -> Deal:
        """Sync deal data from GHL to local database."""
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
            from datetime import datetime
            deal.last_activity_date = datetime.fromisoformat(
                ghl_deal_data["lastActivityDate"].replace("Z", "+00:00")
            )
        
        db.commit()
        db.refresh(deal)
        return deal

