"""Meeting notes integration service for Fireflies and Fathom."""
from typing import Optional, List, Dict, Any
import httpx
import logging
import json
import os
import time

logger = logging.getLogger(__name__)

# /tmp cache TTL for meeting transcripts
_CACHE_TTL = 600  # 10 minutes


class MeetingContext:
    """Common format for meeting transcript data."""

    def __init__(self, title: str, date: str, summary: str,
                 action_items: List[str] = None, keywords: List[str] = None,
                 key_topics: List[str] = None, highlights: List[str] = None,
                 participants: List[str] = None):
        self.title = title
        self.date = date
        self.summary = summary
        self.action_items = action_items or []
        self.keywords = keywords or []
        self.key_topics = key_topics or []
        self.highlights = highlights or []
        self.participants = participants or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "date": self.date,
            "summary": self.summary,
            "action_items": self.action_items,
            "keywords": self.keywords,
            "key_topics": self.key_topics,
            "highlights": self.highlights,
            "participants": self.participants,
        }

    def to_prompt_text(self) -> str:
        """Format for inclusion in AI prompt."""
        parts = [f"MEETING: {self.title} ({self.date})"]
        if self.summary:
            parts.append(f"Summary: {self.summary}")
        if self.key_topics:
            parts.append(f"Key Topics: {', '.join(self.key_topics)}")
        if self.action_items:
            parts.append(f"Action Items: {'; '.join(self.action_items)}")
        if self.highlights:
            parts.append(f"Notable Moments: {'; '.join(self.highlights[:3])}")
        if self.keywords:
            parts.append(f"Keywords: {', '.join(self.keywords)}")
        return "\n".join(parts)


def _cache_key_safe(email: str) -> str:
    """Make email safe for use as a cache filename."""
    return email.replace("@", "_at_").replace(".", "_dot_")


def _read_cache(cache_key: str) -> Optional[List[Dict]]:
    """Read meeting notes from /tmp cache."""
    cache_file = f"/tmp/meeting_notes_{cache_key}.json"
    try:
        if os.path.exists(cache_file):
            with open(cache_file, "r") as f:
                cached = json.load(f)
            if (time.time() - cached.get("ts", 0)) < _CACHE_TTL:
                return cached.get("data")
    except Exception as e:
        logger.warning(f"Meeting notes cache read error: {e}")
    return None


def _write_cache(cache_key: str, data: List[Dict]):
    """Write meeting notes to /tmp cache."""
    cache_file = f"/tmp/meeting_notes_{cache_key}.json"
    try:
        with open(cache_file, "w") as f:
            json.dump({"data": data, "ts": time.time()}, f)
    except Exception as e:
        logger.warning(f"Meeting notes cache write error: {e}")


class FirefliesService:
    """Fireflies.ai integration via GraphQL API."""

    GRAPHQL_URL = "https://api.fireflies.ai/graphql"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def test_connection(self) -> Dict[str, Any]:
        """Test the API key by fetching user info."""
        query = """query { user { name email } }"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GRAPHQL_URL,
                    json={"query": query},
                    headers=self._headers(),
                    timeout=15.0,
                )
                response.raise_for_status()
                data = response.json()
                if data.get("data", {}).get("user"):
                    return {"connected": True, "user": data["data"]["user"]}
                errors = data.get("errors", [])
                error_msg = errors[0].get("message", "Unknown error") if errors else "Invalid API key"
                return {"connected": False, "error": error_msg}
            except httpx.HTTPStatusError as e:
                return {"connected": False, "error": f"HTTP {e.response.status_code}"}
            except Exception as e:
                return {"connected": False, "error": str(e)}

    async def get_transcripts_for_contact(self, contact_email: str,
                                           contact_name: str = "") -> List[MeetingContext]:
        """Search Fireflies transcripts by participant email, falling back to name search."""
        cache_key = f"ff_{_cache_key_safe(contact_email)}"
        cached = _read_cache(cache_key)
        if cached is not None:
            return [MeetingContext(**m) for m in cached]

        meetings: List[MeetingContext] = []

        # Search by participant email
        query = """
        query($participants: [String]) {
            transcripts(participants: $participants, limit: 5) {
                id
                title
                date
                participants
                summary {
                    overview
                    keywords
                    action_items
                    shorthand_bullet
                }
            }
        }
        """

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GRAPHQL_URL,
                    json={"query": query, "variables": {"participants": [contact_email]}},
                    headers=self._headers(),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                transcripts = data.get("data", {}).get("transcripts") or []

                for t in transcripts:
                    mc = self._parse_transcript(t)
                    if mc:
                        meetings.append(mc)

            except Exception as e:
                logger.error(f"Fireflies participant search error for {contact_email}: {e}")

            # Fallback: search by name in transcript titles/content
            if not meetings and contact_name:
                try:
                    name_query = """
                    query($keyword: String) {
                        transcripts(keyword: $keyword, limit: 5) {
                            id title date participants
                            summary { overview keywords action_items shorthand_bullet }
                        }
                    }
                    """
                    name_parts = contact_name.split()
                    search_term = name_parts[0] if name_parts else contact_name

                    response = await client.post(
                        self.GRAPHQL_URL,
                        json={"query": name_query, "variables": {"keyword": search_term}},
                        headers=self._headers(),
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    transcripts = data.get("data", {}).get("transcripts") or []

                    for t in transcripts:
                        # Verify the name actually appears in participants or title
                        title_lower = (t.get("title") or "").lower()
                        participants_lower = [p.lower() for p in (t.get("participants") or [])]
                        if any(part.lower() in title_lower for part in name_parts if len(part) > 2) or \
                           any(contact_name.lower() in p for p in participants_lower):
                            mc = self._parse_transcript(t)
                            if mc:
                                meetings.append(mc)
                except Exception as e:
                    logger.warning(f"Fireflies name search error: {e}")

        # Cache results (even empty to avoid repeated failed lookups)
        _write_cache(cache_key, [m.to_dict() for m in meetings])
        return meetings

    def _parse_transcript(self, t: Dict) -> Optional[MeetingContext]:
        """Parse a Fireflies transcript response into MeetingContext."""
        try:
            summary_data = t.get("summary") or {}
            overview = summary_data.get("overview") or ""
            keywords = summary_data.get("keywords") or []
            action_items = summary_data.get("action_items") or []
            bullets = summary_data.get("shorthand_bullet") or []

            # Parse date — Fireflies returns epoch ms or ISO string
            date_val = t.get("date", "")
            if isinstance(date_val, (int, float)):
                from datetime import datetime
                date_val = datetime.fromtimestamp(date_val / 1000).strftime("%Y-%m-%d")
            else:
                date_val = str(date_val)[:10] if date_val else ""

            # Normalize list fields
            if isinstance(action_items, str):
                action_items = [action_items]
            if isinstance(keywords, str):
                keywords = [keywords]
            if isinstance(bullets, str):
                bullets = [bullets]

            return MeetingContext(
                title=t.get("title", "Meeting"),
                date=date_val,
                summary=overview,
                action_items=action_items,
                keywords=keywords,
                key_topics=keywords[:5] if keywords else [],
                highlights=bullets[:3],
                participants=t.get("participants") or [],
            )
        except Exception as e:
            logger.warning(f"Error parsing Fireflies transcript: {e}")
            return None


class FathomService:
    """Fathom.video integration via REST API."""

    BASE_URL = "https://api.fathom.video/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def test_connection(self) -> Dict[str, Any]:
        """Test the API key by fetching one call."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/calls",
                    headers=self._headers(),
                    params={"limit": 1},
                    timeout=15.0,
                )
                response.raise_for_status()
                return {"connected": True}
            except httpx.HTTPStatusError as e:
                return {"connected": False, "error": f"HTTP {e.response.status_code}"}
            except Exception as e:
                return {"connected": False, "error": str(e)}

    async def get_transcripts_for_contact(self, contact_email: str,
                                           contact_name: str = "") -> List[MeetingContext]:
        """Search Fathom calls by attendee email, falling back to name search."""
        cache_key = f"fathom_{_cache_key_safe(contact_email)}"
        cached = _read_cache(cache_key)
        if cached is not None:
            return [MeetingContext(**m) for m in cached]

        meetings: List[MeetingContext] = []

        async with httpx.AsyncClient() as client:
            # Search by attendee email
            try:
                response = await client.get(
                    f"{self.BASE_URL}/calls",
                    headers=self._headers(),
                    params={"attendee_email": contact_email, "limit": 5},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                calls = self._extract_calls(data)

                for call in calls:
                    mc = await self._parse_call(client, call)
                    if mc:
                        meetings.append(mc)

            except Exception as e:
                logger.error(f"Fathom attendee search error for {contact_email}: {e}")

            # Fallback: search by name
            if not meetings and contact_name:
                try:
                    response = await client.get(
                        f"{self.BASE_URL}/calls",
                        headers=self._headers(),
                        params={"query": contact_name, "limit": 3},
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    calls = self._extract_calls(data)

                    for call in calls:
                        mc = await self._parse_call(client, call)
                        if mc:
                            meetings.append(mc)
                except Exception as e:
                    logger.warning(f"Fathom name search error: {e}")

        _write_cache(cache_key, [m.to_dict() for m in meetings])
        return meetings

    def _extract_calls(self, data: Any) -> List[Dict]:
        """Extract call list from various Fathom response formats."""
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("calls") or data.get("data") or []
        return []

    async def _parse_call(self, client: httpx.AsyncClient, call: Dict) -> Optional[MeetingContext]:
        """Parse a Fathom call into MeetingContext, fetching details if needed."""
        try:
            call_id = call.get("id")
            summary = call.get("summary") or ""
            action_items = call.get("action_items") or []
            highlights = call.get("highlights") or call.get("key_moments") or []

            # Fetch detailed info if summary is missing
            if call_id and not summary:
                try:
                    detail_resp = await client.get(
                        f"{self.BASE_URL}/calls/{call_id}",
                        headers=self._headers(),
                        timeout=15.0,
                    )
                    detail_resp.raise_for_status()
                    detail = detail_resp.json()
                    summary = detail.get("summary") or summary
                    action_items = detail.get("action_items") or action_items
                    highlights = detail.get("highlights") or highlights
                except Exception:
                    pass

            # Normalize list fields
            if isinstance(action_items, str):
                action_items = [action_items]
            if isinstance(highlights, str):
                highlights = [highlights]

            attendees = call.get("attendees") or []
            participants = [a.get("email", "") for a in attendees if isinstance(a, dict)]

            return MeetingContext(
                title=call.get("title") or call.get("name") or "Call",
                date=str(call.get("created_at") or call.get("date") or "")[:10],
                summary=summary,
                action_items=action_items,
                keywords=[],
                key_topics=[],
                highlights=highlights[:3],
                participants=participants,
            )
        except Exception as e:
            logger.warning(f"Error parsing Fathom call: {e}")
            return None


def get_meeting_notes_service(user) -> Optional[object]:
    """Factory: return the correct meeting notes service based on user's connected integration.
    Returns FirefliesService, FathomService, or None if neither is connected."""
    if getattr(user, 'fireflies_api_key', None):
        return FirefliesService(user.fireflies_api_key)
    if getattr(user, 'fathom_api_key', None):
        return FathomService(user.fathom_api_key)
    return None
