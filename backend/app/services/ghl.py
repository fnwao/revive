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
    
    Returns GHLService if user has GHL credentials, otherwise GHLMockService.
    Prioritizes user credentials over global mock setting - if user has connected
    GHL, always use real service regardless of config.
    """
    # Check if user has GHL credentials - if so, use real service
    # This takes priority over the global use_mock_ghl setting
    if user.ghl_access_token and user.ghl_location_id:
        logger.info(f"Using REAL GHL service for user {user.id} (has credentials)")
        return GHLService(user)
    
    # Otherwise, use mock service (user doesn't have credentials)
    logger.info(f"Using MOCK GHL service for user {user.id} (no credentials)")
    from app.services.ghl_mock import GHLMockService
    return GHLMockService(user)


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
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Version": "2021-07-28"
        }
        # Location-Id is required by GHL API for most endpoints
        if self.location_id:
            headers["Location-Id"] = self.location_id
        return headers
    
    async def get_deal(self, deal_id: str) -> Optional[Dict[str, Any]]:
        """Fetch deal details from GHL."""
        if not self.access_token or not self.location_id:
            logger.error(f"Cannot fetch deal {deal_id}: missing credentials (token: {bool(self.access_token)}, location: {bool(self.location_id)})")
            return None
            
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.BASE_URL}/opportunities/{deal_id}"
                headers = self._get_headers()
                logger.info(f"Fetching deal from GHL: {url}, location_id={self.location_id}")
                logger.debug(f"Headers: {list(headers.keys())} (Authorization and Location-Id present)")
                
                response = await client.get(url, headers=headers, timeout=30.0)
                logger.debug(f"GHL API response status: {response.status_code}")
                
                response.raise_for_status()
                data = response.json()
                logger.info(f"Successfully fetched deal {deal_id} from GHL: {data.get('title', 'No title')}")
                return data
            except httpx.HTTPStatusError as e:
                error_text = e.response.text[:500] if e.response.text else "No error text"
                logger.error(f"HTTP error fetching deal {deal_id}: {e.response.status_code} - {error_text}")
                logger.error(f"Response headers: {dict(e.response.headers)}")
                return None
            except httpx.HTTPError as e:
                logger.error(f"HTTP client error fetching deal {deal_id}: {str(e)}", exc_info=True)
                return None
            except Exception as e:
                logger.error(f"Unexpected error fetching deal {deal_id}: {str(e)}", exc_info=True)
                return None
    
    async def get_deals_by_pipeline(self, pipeline_id: str = None) -> List[Dict[str, Any]]:
        """Fetch all deals in a pipeline, or all deals if no pipeline_id provided."""
        if not self.access_token or not self.location_id:
            logger.error(f"Cannot fetch deals: missing credentials (token: {bool(self.access_token)}, location: {bool(self.location_id)})")
            return []
            
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.BASE_URL}/opportunities"
                headers = self._get_headers()
                params = {}
                
                if pipeline_id:
                    params["pipelineId"] = pipeline_id
                
                logger.info(f"Fetching deals from GHL: {url}, pipeline_id={pipeline_id}, location_id={self.location_id}")
                logger.debug(f"Request params: {params}")
                logger.debug(f"Headers include: {list(headers.keys())}")
                
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
                logger.debug(f"GHL API response status: {response.status_code}")
                
                response.raise_for_status()
                data = response.json()
                logger.debug(f"GHL API raw response type: {type(data)}")
                logger.debug(f"GHL API response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                logger.debug(f"GHL API response preview: {str(data)[:500]}")
                
                # GHL API may return opportunities directly or in a nested structure
                opportunities = []
                
                # Handle different response structures
                if isinstance(data, list):
                    # Direct array of opportunities
                    opportunities = data
                    logger.debug("Response is direct array of opportunities")
                elif isinstance(data, dict):
                    # Try various nested keys
                    opportunities = data.get("opportunities", [])
                    if not opportunities:
                        opportunities = data.get("deals", [])
                    if not opportunities:
                        opportunities = data.get("data", [])
                    if not opportunities:
                        # Check if response has a 'results' or 'items' key
                        opportunities = data.get("results", data.get("items", []))
                    
                    logger.debug(f"Response is dict with keys: {list(data.keys())}")
                
                # If still no opportunities, log the full response structure for debugging
                if not opportunities:
                    logger.warning(f"No opportunities found in GHL response. Full response structure: {type(data)}")
                    if isinstance(data, dict):
                        logger.warning(f"Available keys in response: {list(data.keys())}")
                        # Log sample of first key's value to help debug
                        for key in list(data.keys())[:3]:
                            logger.warning(f"Response['{key}'] type: {type(data[key])}, value preview: {str(data[key])[:200]}")
                    # Also check if response indicates pagination or other structures
                    if isinstance(data, dict) and "meta" in data:
                        logger.info(f"Response contains 'meta' key - might be paginated: {data['meta']}")
                    if isinstance(data, dict) and "pagination" in data:
                        logger.info(f"Response contains 'pagination' key: {data['pagination']}")
                
                logger.info(f"Successfully fetched {len(opportunities)} deals from GHL")
                if len(opportunities) > 0:
                    logger.debug(f"First deal sample keys: {list(opportunities[0].keys()) if isinstance(opportunities[0], dict) else 'Not a dict'}")
                    logger.debug(f"First deal sample: {str(opportunities[0])[:300]}")
                else:
                    logger.warning("GHL API returned empty opportunities list. This might be expected if there are no deals.")
                
                return opportunities
            except httpx.HTTPStatusError as e:
                error_text = e.response.text[:500] if e.response.text else "No error text"
                logger.error(f"HTTP error fetching deals: {e.response.status_code} - {error_text}")
                logger.error(f"Response headers: {dict(e.response.headers)}")
                logger.error(f"Request URL: {url}, Params: {params}")
                return []
            except httpx.HTTPError as e:
                logger.error(f"HTTP client error fetching deals: {str(e)}", exc_info=True)
                return []
            except Exception as e:
                logger.error(f"Unexpected error fetching deals: {str(e)}", exc_info=True)
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
                    logger.warning(f"Deal {deal_id} has no contactId, cannot fetch conversations")
                    return []
                
                contact_id = deal["contactId"]
                
                # Fetch messages (SMS, email, calls)
                # GHL API endpoint for communications
                url = f"{self.BASE_URL}/contacts/{contact_id}/communications"
                headers = self._get_headers()
                params = {"limit": limit}
                
                logger.info(f"Fetching conversations for deal {deal_id}, contact {contact_id}")
                
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # GHL API may return communications directly or in a nested structure
                communications = data.get("communications", [])
                if not communications and isinstance(data, list):
                    communications = data
                
                logger.info(f"Successfully fetched {len(communications)} conversations for deal {deal_id}")
                return communications
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching conversations for deal {deal_id}: {e.response.status_code} - {e.response.text}")
                return []
            except httpx.HTTPError as e:
                logger.error(f"Error fetching conversations for deal {deal_id}: {str(e)}")
                return []
            except Exception as e:
                logger.error(f"Unexpected error fetching conversations for deal {deal_id}: {str(e)}", exc_info=True)
                return []
    
    async def send_sms(
        self, 
        contact_id: str, 
        message: str
    ) -> bool:
        """Send SMS message via GHL."""
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.BASE_URL}/contacts/{contact_id}/communications/sms"
                headers = self._get_headers()
                
                # GHL API expects phone number and message
                payload = {
                    "phone": contact_id,  # Contact phone number
                    "message": message
                }
                
                logger.info(f"Sending SMS to contact {contact_id} via GHL")
                
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"Successfully sent SMS to contact {contact_id}")
                return True
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error sending SMS: {e.response.status_code} - {e.response.text}")
                return False
            except httpx.HTTPError as e:
                logger.error(f"Error sending SMS: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Unexpected error sending SMS: {str(e)}", exc_info=True)
                return False
    
    async def send_email(
        self,
        contact_id: str,
        subject: str,
        body: str,
        deal_id: Optional[str] = None
    ) -> bool:
        """Send email via GHL."""
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.BASE_URL}/contacts/{contact_id}/communications/email"
                headers = self._get_headers()
                
                payload = {
                    "to": contact_id,  # Contact email
                    "subject": subject,
                    "htmlBody": body,
                    "textBody": body  # Plain text fallback
                }
                
                if deal_id:
                    payload["dealId"] = deal_id
                
                logger.info(f"Sending email to contact {contact_id} via GHL")
                
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"Successfully sent email to contact {contact_id}")
                return True
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error sending email: {e.response.status_code} - {e.response.text}")
                return False
            except httpx.HTTPError as e:
                logger.error(f"Error sending email: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Unexpected error sending email: {str(e)}", exc_info=True)
                return False
    
    async def get_deal_emails(
        self,
        deal_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get email conversation history for a deal."""
        async with httpx.AsyncClient() as client:
            try:
                # Get contact ID from deal first
                deal = await self.get_deal(deal_id)
                if not deal or not deal.get("contactId"):
                    logger.warning(f"Deal {deal_id} has no contactId, cannot fetch emails")
                    return []
                
                contact_id = deal["contactId"]
                
                # Fetch emails
                url = f"{self.BASE_URL}/contacts/{contact_id}/communications/email"
                headers = self._get_headers()
                params = {"limit": limit}
                
                logger.info(f"Fetching emails for deal {deal_id}, contact {contact_id}")
                
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # GHL API may return emails directly or in a nested structure
                emails = data.get("emails", [])
                if not emails and isinstance(data, list):
                    emails = data
                
                logger.info(f"Successfully fetched {len(emails)} emails for deal {deal_id}")
                return emails
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching emails for deal {deal_id}: {e.response.status_code} - {e.response.text}")
                return []
            except httpx.HTTPError as e:
                logger.error(f"Error fetching emails for deal {deal_id}: {str(e)}")
                return []
            except Exception as e:
                logger.error(f"Unexpected error fetching emails for deal {deal_id}: {str(e)}", exc_info=True)
                return []
    
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
        
        # Save tags if available - GHL API may return tags in different formats:
        # 1. Array of tag objects: [{"id": "tag1", "name": "Tag Name"}, ...]
        # 2. Array of tag IDs: ["tag1", "tag2", ...]
        # 3. Array of tag names: ["Tag Name 1", "Tag Name 2", ...]
        tags = ghl_deal_data.get("tags") or ghl_deal_data.get("tagIds") or []
        if tags:
            if isinstance(tags, list):
                # Extract tag names/ids from objects or use strings directly
                processed_tags = []
                for tag in tags:
                    if isinstance(tag, dict):
                        # Tag object: prefer name, fall back to id
                        tag_value = tag.get("name") or tag.get("id")
                        if tag_value:
                            processed_tags.append(tag_value)
                    elif isinstance(tag, str):
                        processed_tags.append(tag)
                    else:
                        processed_tags.append(str(tag))
                deal.tags = processed_tags if processed_tags else None
            else:
                # Single tag value
                deal.tags = [str(tags)]
        else:
            deal.tags = None
        
        # Parse dates - handle various GHL date formats
        last_activity_date_str = ghl_deal_data.get("lastActivityDate") or ghl_deal_data.get("lastActivity") or ghl_deal_data.get("updatedAt")
        if last_activity_date_str:
            from datetime import datetime
            try:
                # Handle ISO format with Z
                if isinstance(last_activity_date_str, str):
                    date_str = last_activity_date_str.replace("Z", "+00:00")
                    deal.last_activity_date = datetime.fromisoformat(date_str)
                elif isinstance(last_activity_date_str, datetime):
                    deal.last_activity_date = last_activity_date_str
                else:
                    logger.warning(f"Unexpected date format for deal {ghl_deal_id}: {type(last_activity_date_str)}")
            except Exception as e:
                logger.error(f"Error parsing lastActivityDate for deal {ghl_deal_id}: {e}, value: {last_activity_date_str}")
        
        db.commit()
        db.refresh(deal)
        return deal

