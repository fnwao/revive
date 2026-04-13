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

    _CACHE_TTL = 300  # 5 minutes

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
                # GHL wraps single opportunity in {"opportunity": {...}}
                deal = data.get("opportunity", data) if isinstance(data, dict) else data
                logger.info(f"Successfully fetched deal {deal_id} from GHL: {deal.get('name', 'No title')}")
                return deal
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
        """Fetch all deals in a pipeline, or all deals if no pipeline_id provided. Handles pagination."""
        if not self.access_token or not self.location_id:
            logger.error(f"Cannot fetch deals: missing credentials")
            return []

        # File-based cache on /tmp to survive Vercel serverless invocations
        import time, json as _json, os
        cache_file = f"/tmp/ghl_deals_{self.location_id}_{pipeline_id or 'all'}.json"
        cached = None
        try:
            if os.path.exists(cache_file):
                with open(cache_file, "r") as f:
                    cached = _json.load(f)
                if (time.time() - cached.get("ts", 0)) < GHLService._CACHE_TTL:
                    logger.info(f"Using cached deals ({len(cached['data'])} deals, age={int(time.time() - cached['ts'])}s)")
                    return cached["data"]
        except Exception as e:
            logger.warning(f"Cache read error: {e}")

        all_opportunities = []
        max_pages = 10  # Safety limit

        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.BASE_URL}/opportunities/search"
                headers = self._get_headers()
                params = {"location_id": self.location_id}

                if pipeline_id:
                    params["pipeline_id"] = pipeline_id

                for page in range(max_pages):
                    logger.info(f"Fetching deals page {page + 1} from GHL")

                    response = await client.get(url, headers=headers, params=params, timeout=30.0)
                    response.raise_for_status()
                    data = response.json()

                    opportunities = []
                    if isinstance(data, list):
                        opportunities = data
                    elif isinstance(data, dict):
                        opportunities = data.get("opportunities", [])

                    all_opportunities.extend(opportunities)

                    # Check for next page
                    meta = data.get("meta", {}) if isinstance(data, dict) else {}
                    start_after = meta.get("startAfter")
                    start_after_id = meta.get("startAfterId")

                    if not start_after or not start_after_id or not opportunities:
                        break

                    # Set pagination params for next request
                    params["startAfter"] = start_after
                    params["startAfterId"] = start_after_id

                logger.info(f"Fetched {len(all_opportunities)} total deals from GHL")
                # Cache to /tmp file
                try:
                    with open(cache_file, "w") as f:
                        _json.dump({"data": all_opportunities, "ts": time.time()}, f)
                except Exception as e:
                    logger.warning(f"Cache write error: {e}")
                return all_opportunities

            except httpx.HTTPStatusError as e:
                error_text = e.response.text[:500] if e.response.text else "No error text"
                logger.error(f"HTTP error fetching deals: {e.response.status_code} - {error_text}")
                # On rate limit, return cached data if available (even stale)
                if e.response.status_code == 429 and cached and cached.get("data"):
                    logger.info(f"Rate limited - returning stale cache ({len(cached['data'])} deals)")
                    return cached["data"]
                return all_opportunities  # Return what we got so far
            except httpx.HTTPError as e:
                logger.error(f"HTTP client error fetching deals: {str(e)}", exc_info=True)
                return all_opportunities
            except Exception as e:
                logger.error(f"Unexpected error fetching deals: {str(e)}", exc_info=True)
                return []
    
    async def get_deal_conversations(
        self,
        deal_id: str,
        limit: int = 20,
        deal_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch conversation history for a deal using GHL conversations API."""
        async with httpx.AsyncClient() as client:
            try:
                # Use provided deal data or fetch it
                deal = deal_data or await self.get_deal(deal_id)
                if not deal:
                    logger.warning(f"Deal {deal_id} not found")
                    return []

                contact_id = deal.get("contactId") or (deal.get("contact", {}) or {}).get("id")
                if not contact_id:
                    logger.warning(f"Deal {deal_id} has no contactId")
                    return []

                # Step 1: Search for conversations for this contact
                headers = self._get_headers()
                search_url = f"{self.BASE_URL}/conversations/search"
                search_params = {
                    "contactId": contact_id,
                    "locationId": self.location_id
                }

                response = await client.get(search_url, headers=headers, params=search_params, timeout=30.0)
                response.raise_for_status()
                conv_data = response.json()
                conversations = conv_data.get("conversations", [])

                if not conversations:
                    logger.info(f"No conversations found for contact {contact_id}")
                    return []

                # Step 2: Get messages from first conversation (most recent)
                all_messages = []
                for conv in conversations[:5]:  # Check up to 5 conversation threads
                    conv_id = conv.get("id")
                    if not conv_id:
                        continue

                    msg_url = f"{self.BASE_URL}/conversations/{conv_id}/messages"
                    msg_response = await client.get(msg_url, headers=headers, timeout=30.0)
                    msg_response.raise_for_status()
                    msg_data = msg_response.json()

                    # Messages are nested: {"messages": {"messages": [...]}}
                    messages_wrapper = msg_data.get("messages", {})
                    if isinstance(messages_wrapper, dict):
                        messages = messages_wrapper.get("messages", [])
                    else:
                        messages = messages_wrapper

                    for msg in messages:
                        # Normalize message format for AI consumption
                        direction = msg.get("direction") or msg.get("meta", {}).get("email", {}).get("direction", "unknown")
                        msg_type = msg.get("messageType", "")
                        body = msg.get("body") or msg.get("text") or ""

                        # For emails, get subject from meta
                        subject = ""
                        if "email" in (msg.get("meta") or {}):
                            subject = msg["meta"]["email"].get("subject", "")

                        # Skip system/activity messages with no useful content
                        if msg_type in ("TYPE_ACTIVITY_OPPORTUNITY", "TYPE_ACTIVITY_APPOINTMENT") and not body:
                            body = msg.get("body", "")

                        content = body
                        if subject and not body:
                            content = f"[Email] Subject: {subject}"
                        elif subject and body:
                            content = f"[Email] Subject: {subject}\n{body}"

                        if content.strip():
                            all_messages.append({
                                "direction": direction,
                                "content": content,
                                "type": msg_type.replace("TYPE_", "").lower() if msg_type else "message",
                                "sentAt": msg.get("dateAdded", ""),
                                "createdAt": msg.get("dateAdded", ""),
                            })

                # Get contact info for meeting notes matching and metadata
                contact_email = (deal.get("contact", {}) or {}).get("email", "")
                contact_name = (deal.get("contact", {}) or {}).get("name", "") or deal.get("name", "")

                # Fetch contact details for richer context (custom fields, tags, notes)
                try:
                    contact_url = f"{self.BASE_URL}/contacts/{contact_id}"
                    contact_response = await client.get(contact_url, headers=headers, timeout=15.0)
                    contact_response.raise_for_status()
                    contact_data = contact_response.json()
                    contact_obj = contact_data.get("contact", contact_data)

                    # Add custom fields as context
                    custom_fields = contact_obj.get("customFields") or contact_obj.get("customField") or []
                    if custom_fields:
                        cf_parts = []
                        for cf in custom_fields:
                            fname = cf.get("name") or cf.get("fieldKey") or ""
                            fval = cf.get("value") or cf.get("fieldValue") or ""
                            if fname and fval:
                                cf_parts.append(f"{fname}: {fval}")
                        if cf_parts:
                            all_messages.insert(0, {
                                "direction": "context",
                                "content": f"CONTACT DETAILS:\n" + "\n".join(cf_parts),
                                "type": "contact_info",
                                "sentAt": "",
                                "createdAt": "",
                            })

                    # Add tags as context
                    tags = contact_obj.get("tags") or []
                    if tags:
                        tag_names = [t.get("name", str(t)) if isinstance(t, dict) else str(t) for t in tags]
                        all_messages.insert(0, {
                            "direction": "context",
                            "content": f"CONTACT TAGS: {', '.join(tag_names)}",
                            "type": "contact_tags",
                            "sentAt": "",
                            "createdAt": "",
                        })

                    # Use contact email/name from detailed response if available
                    if not contact_email:
                        contact_email = contact_obj.get("email", "")
                    if not contact_name:
                        contact_name = f"{contact_obj.get('firstName', '')} {contact_obj.get('lastName', '')}".strip()
                except Exception as e:
                    logger.warning(f"Error fetching contact metadata for {contact_id}: {e}")

                # Add meeting notes context (Fireflies or Fathom - live API)
                from app.services.meeting_notes import get_meeting_notes_service
                meeting_service = get_meeting_notes_service(self.user)
                if meeting_service:
                    try:
                        meetings = await meeting_service.get_transcripts_for_contact(
                            contact_email, contact_name
                        )
                        for meeting in meetings:
                            all_messages.insert(0, {
                                "direction": "context",
                                "content": meeting.to_prompt_text(),
                                "type": "meeting_notes",
                                "sentAt": "",
                                "createdAt": "",
                            })
                        if meetings:
                            logger.info(f"Added {len(meetings)} meeting transcripts for {contact_email}")
                    except Exception as e:
                        logger.warning(f"Error fetching meeting notes for {contact_email}: {e}")

                logger.info(f"Fetched {len(all_messages)} messages for deal {deal_id}")
                return all_messages[:limit]

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching conversations for deal {deal_id}: {e.response.status_code}")
                return []
            except Exception as e:
                logger.error(f"Error fetching conversations for deal {deal_id}: {str(e)}", exc_info=True)
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
        
        # Update deal fields (GHL uses "name" not "title", "contactId" from nested contact)
        deal.ghl_contact_id = ghl_deal_data.get("contactId") or (ghl_deal_data.get("contact", {}) or {}).get("id")
        deal.ghl_pipeline_id = ghl_deal_data.get("pipelineId")
        deal.title = ghl_deal_data.get("title") or ghl_deal_data.get("name")
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
        last_activity_date_str = ghl_deal_data.get("lastActivityDate") or ghl_deal_data.get("lastActionDate") or ghl_deal_data.get("updatedAt") or ghl_deal_data.get("createdAt")
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

