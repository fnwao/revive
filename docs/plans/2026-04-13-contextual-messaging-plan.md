# Contextual Messaging & Meeting Notes Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Revive.ai messages deeply contextual by pulling live meeting transcripts from Fireflies/Fathom and richer GHL data, with proper email vs SMS formatting in the UI.

**Architecture:** Pluggable MeetingNotesService with Fireflies and Fathom implementations. Context pipeline gathers GHL conversations + meeting transcripts in parallel at generate-time. Frontend gets Integrations settings section and channel-aware message display.

**Tech Stack:** Python/FastAPI, SQLAlchemy, httpx, Anthropic Claude, Next.js/React, Tailwind CSS

---

### Task 1: Add integration fields to User model + migration

**Files:**
- Modify: `backend/app/models/user.py`
- Create: `backend/alembic/versions/add_meeting_integration_fields.py`

**Step 1: Add columns to User model**

In `backend/app/models/user.py`, add after `email_address` (line 29):

```python
# Meeting notes integration (mutually exclusive - only one active at a time)
fireflies_api_key = Column(Text, nullable=True)
fathom_api_key = Column(Text, nullable=True)
```

**Step 2: Create alembic migration**

Run: `cd backend && alembic revision --autogenerate -m "add meeting integration fields"`

If alembic autogenerate doesn't work (SQLite), create manually:

```python
"""add meeting integration fields"""
revision = 'meeting_int_001'
down_revision = 'e466d1f78685'  # last migration

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users', sa.Column('fireflies_api_key', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('fathom_api_key', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('users', 'fathom_api_key')
    op.drop_column('users', 'fireflies_api_key')
```

**Step 3: Run migration**

Run: `cd backend && alembic upgrade head`

If SQLite issues, the app auto-creates tables on startup anyway via `Base.metadata.create_all()`.

**Step 4: Commit**

```bash
git add backend/app/models/user.py backend/alembic/versions/
git commit -m "feat: add fireflies and fathom API key fields to User model"
```

---

### Task 2: Create MeetingNotesService with Fireflies implementation

**Files:**
- Create: `backend/app/services/meeting_notes.py`

**Step 1: Create the service file**

```python
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

    async def test_connection(self) -> Dict[str, Any]:
        """Test the API key by fetching user info."""
        query = """query { user { name email } }"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GRAPHQL_URL,
                    json={"query": query},
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
                    timeout=15.0,
                )
                response.raise_for_status()
                data = response.json()
                if data.get("data", {}).get("user"):
                    return {"connected": True, "user": data["data"]["user"]}
                return {"connected": False, "error": "Invalid API key"}
            except Exception as e:
                return {"connected": False, "error": str(e)}

    async def get_transcripts_for_contact(self, contact_email: str,
                                           contact_name: str = "") -> List[MeetingContext]:
        """Search Fireflies transcripts by participant email."""
        # Check cache first
        cache_key = f"ff_{contact_email.replace('@', '_at_')}"
        cached = _read_cache(cache_key)
        if cached is not None:
            return [MeetingContext(**m) for m in cached]

        meetings = []

        # Search by participant email
        query = """
        query($email: String) {
            transcripts(participants: [$email], limit: 5) {
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
                    json={"query": query, "variables": {"email": contact_email}},
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                transcripts = data.get("data", {}).get("transcripts") or []

                for t in transcripts:
                    summary_data = t.get("summary") or {}
                    overview = summary_data.get("overview") or ""
                    keywords = summary_data.get("keywords") or []
                    action_items = summary_data.get("action_items") or []
                    bullets = summary_data.get("shorthand_bullet") or []

                    # Parse date
                    date_val = t.get("date", "")
                    if isinstance(date_val, (int, float)):
                        from datetime import datetime
                        date_val = datetime.fromtimestamp(date_val / 1000).strftime("%Y-%m-%d")

                    mc = MeetingContext(
                        title=t.get("title", "Meeting"),
                        date=str(date_val)[:10] if date_val else "",
                        summary=overview,
                        action_items=action_items if isinstance(action_items, list) else [action_items],
                        keywords=keywords if isinstance(keywords, list) else [],
                        key_topics=keywords[:5] if keywords else [],
                        highlights=bullets[:3] if isinstance(bullets, list) else [],
                        participants=t.get("participants") or [],
                    )
                    meetings.append(mc)

            except Exception as e:
                logger.error(f"Fireflies API error for {contact_email}: {e}")

            # If no results by email and we have a name, try title search
            if not meetings and contact_name:
                try:
                    name_query = """
                    query($keyword: String) {
                        transcripts(keyword: $keyword, limit: 3) {
                            id title date participants
                            summary { overview keywords action_items shorthand_bullet }
                        }
                    }
                    """
                    # Use first+last name for search
                    name_parts = contact_name.split()
                    search_term = name_parts[0] if name_parts else contact_name

                    response = await client.post(
                        self.GRAPHQL_URL,
                        json={"query": name_query, "variables": {"keyword": search_term}},
                        headers={"Authorization": f"Bearer {self.api_key}",
                                 "Content-Type": "application/json"},
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    transcripts = data.get("data", {}).get("transcripts") or []

                    for t in transcripts:
                        # Verify name appears in title or participants
                        title_lower = (t.get("title") or "").lower()
                        participants = [p.lower() for p in (t.get("participants") or [])]
                        name_lower = contact_name.lower()
                        if any(part.lower() in title_lower for part in name_parts if len(part) > 2) or \
                           any(name_lower in p for p in participants):
                            summary_data = t.get("summary") or {}
                            date_val = t.get("date", "")
                            if isinstance(date_val, (int, float)):
                                from datetime import datetime
                                date_val = datetime.fromtimestamp(date_val / 1000).strftime("%Y-%m-%d")
                            mc = MeetingContext(
                                title=t.get("title", "Meeting"),
                                date=str(date_val)[:10] if date_val else "",
                                summary=summary_data.get("overview", ""),
                                action_items=summary_data.get("action_items") or [],
                                keywords=summary_data.get("keywords") or [],
                                key_topics=(summary_data.get("keywords") or [])[:5],
                                highlights=(summary_data.get("shorthand_bullet") or [])[:3],
                                participants=t.get("participants") or [],
                            )
                            meetings.append(mc)
                except Exception as e:
                    logger.warning(f"Fireflies name search error: {e}")

        # Cache results
        _write_cache(cache_key, [m.to_dict() for m in meetings])
        return meetings


class FathomService:
    """Fathom.video integration via REST API."""

    BASE_URL = "https://api.fathom.video/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def test_connection(self) -> Dict[str, Any]:
        """Test the API key by fetching account info."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/calls",
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
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
        """Search Fathom calls by attendee email."""
        cache_key = f"fathom_{contact_email.replace('@', '_at_')}"
        cached = _read_cache(cache_key)
        if cached is not None:
            return [MeetingContext(**m) for m in cached]

        meetings = []

        async with httpx.AsyncClient() as client:
            try:
                # Fathom API: list calls, filter by attendee email
                response = await client.get(
                    f"{self.BASE_URL}/calls",
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
                    params={"attendee_email": contact_email, "limit": 5},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                calls = data.get("calls") or data if isinstance(data, list) else data.get("data") or []

                for call in calls:
                    # Get call summary/details
                    call_id = call.get("id")
                    summary = call.get("summary") or ""
                    action_items = call.get("action_items") or []
                    highlights = call.get("highlights") or call.get("key_moments") or []

                    if call_id and not summary:
                        # Fetch detailed call info
                        try:
                            detail_resp = await client.get(
                                f"{self.BASE_URL}/calls/{call_id}",
                                headers={"Authorization": f"Bearer {self.api_key}"},
                                timeout=15.0,
                            )
                            detail_resp.raise_for_status()
                            detail = detail_resp.json()
                            summary = detail.get("summary") or ""
                            action_items = detail.get("action_items") or action_items
                            highlights = detail.get("highlights") or highlights
                        except Exception:
                            pass

                    mc = MeetingContext(
                        title=call.get("title") or call.get("name") or "Call",
                        date=str(call.get("created_at") or call.get("date") or "")[:10],
                        summary=summary,
                        action_items=action_items if isinstance(action_items, list) else [action_items] if action_items else [],
                        keywords=[],
                        key_topics=[],
                        highlights=highlights[:3] if isinstance(highlights, list) else [],
                        participants=[a.get("email", "") for a in (call.get("attendees") or [])],
                    )
                    meetings.append(mc)

            except Exception as e:
                logger.error(f"Fathom API error for {contact_email}: {e}")

            # Fallback: search by name in call titles
            if not meetings and contact_name:
                try:
                    response = await client.get(
                        f"{self.BASE_URL}/calls",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        params={"query": contact_name, "limit": 3},
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    calls = data.get("calls") or data if isinstance(data, list) else data.get("data") or []

                    for call in calls:
                        mc = MeetingContext(
                            title=call.get("title") or "Call",
                            date=str(call.get("created_at") or "")[:10],
                            summary=call.get("summary") or "",
                            action_items=call.get("action_items") or [],
                            keywords=[],
                            key_topics=[],
                            highlights=(call.get("highlights") or [])[:3],
                            participants=[a.get("email", "") for a in (call.get("attendees") or [])],
                        )
                        meetings.append(mc)
                except Exception as e:
                    logger.warning(f"Fathom name search error: {e}")

        _write_cache(cache_key, [m.to_dict() for m in meetings])
        return meetings


def get_meeting_notes_service(user) -> Optional[object]:
    """Factory: return the correct meeting notes service based on user's connected integration.
    Returns FirefliesService, FathomService, or None."""
    if getattr(user, 'fireflies_api_key', None):
        return FirefliesService(user.fireflies_api_key)
    if getattr(user, 'fathom_api_key', None):
        return FathomService(user.fathom_api_key)
    return None
```

**Step 2: Commit**

```bash
git add backend/app/services/meeting_notes.py
git commit -m "feat: add MeetingNotesService with Fireflies and Fathom implementations"
```

---

### Task 3: Enhance GHL conversation fetching

**Files:**
- Modify: `backend/app/services/ghl.py`

**Step 1: Remove conversation thread cap and add contact metadata**

In `get_deal_conversations()`, change `conversations[:2]` to `conversations[:5]` (line 215) to fetch more threads.

Add contact custom fields/notes fetching after the conversation messages loop. After the `all_messages` loop and before the Fireflies context section (around line 262), add a contact metadata fetch:

```python
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

    # Add notes as context
    notes = contact_obj.get("notes") or []
    if notes:
        note_texts = []
        for note in notes[:5]:  # Max 5 notes
            body = note.get("body") or note.get("content") or ""
            if body:
                note_texts.append(body)
        if note_texts:
            all_messages.insert(0, {
                "direction": "context",
                "content": f"CONTACT NOTES:\n" + "\n---\n".join(note_texts),
                "type": "contact_notes",
                "sentAt": "",
                "createdAt": "",
            })
except Exception as e:
    logger.warning(f"Error fetching contact metadata for {contact_id}: {e}")
```

**Step 2: Replace static Fireflies cache with live service call**

Replace the existing `_get_fireflies_context` method and the call to it in `get_deal_conversations`. The old static cache approach (lines 267-275 and 287-330) gets replaced.

Remove the `_get_fireflies_context` method entirely.

Replace the Fireflies section in `get_deal_conversations` (around lines 262-275) with:

```python
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
    except Exception as e:
        logger.warning(f"Error fetching meeting notes: {e}")
```

**Step 3: Commit**

```bash
git add backend/app/services/ghl.py
git commit -m "feat: enhance GHL context with more threads, contact metadata, and live meeting notes"
```

---

### Task 4: Add integration endpoints to settings API

**Files:**
- Modify: `backend/app/api/settings.py`
- Modify: `backend/app/schemas/settings.py`

**Step 1: Add integration fields to schemas**

In `backend/app/schemas/settings.py`, add to `UserSettingsUpdate`:

```python
fireflies_api_key: Optional[str] = None
fathom_api_key: Optional[str] = None
```

Add to `UserSettingsResponse`:

```python
fireflies_connected: bool = False
fathom_connected: bool = False
```

**Step 2: Add integration endpoints to settings API**

In `backend/app/api/settings.py`, add after the existing `update_settings` endpoint:

```python
from app.services.meeting_notes import FirefliesService, FathomService

@router.put("/integrations")
async def update_integrations(
    integration_type: str,  # "fireflies" or "fathom"
    api_key: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect or disconnect a meeting notes integration.
    Connecting one disconnects the other (mutually exclusive)."""
    if integration_type not in ("fireflies", "fathom"):
        raise HTTPException(status_code=400, detail="Invalid integration type")

    if api_key:
        # Connecting - disconnect the other first
        if integration_type == "fireflies":
            user.fireflies_api_key = api_key
            user.fathom_api_key = None
        else:
            user.fathom_api_key = api_key
            user.fireflies_api_key = None
    else:
        # Disconnecting
        if integration_type == "fireflies":
            user.fireflies_api_key = None
        else:
            user.fathom_api_key = None

    db.commit()
    db.refresh(user)

    return {
        "fireflies_connected": bool(user.fireflies_api_key),
        "fathom_connected": bool(user.fathom_api_key),
    }


@router.post("/integrations/test")
async def test_integration(
    integration_type: str,
    api_key: str,
    user: User = Depends(get_current_user),
):
    """Test a meeting notes integration API key."""
    if integration_type == "fireflies":
        service = FirefliesService(api_key)
    elif integration_type == "fathom":
        service = FathomService(api_key)
    else:
        raise HTTPException(status_code=400, detail="Invalid integration type")

    result = await service.test_connection()
    return result
```

**Step 3: Update GET /settings response to include integration status**

In the `get_settings` endpoint, add to `response_data`:

```python
"fireflies_connected": bool(user.fireflies_api_key),
"fathom_connected": bool(user.fathom_api_key),
```

Also update the `update_settings` endpoint response to include the same fields.

**Step 4: Handle integration keys in update_settings**

In the `update_settings` endpoint, add handling for the new fields (similar to ghl_api_key):

```python
# Handle meeting integration keys (mutually exclusive)
fireflies_key = update_data.pop("fireflies_api_key", None)
fathom_key = update_data.pop("fathom_api_key", None)
if fireflies_key is not None:
    user.fireflies_api_key = fireflies_key if fireflies_key else None
    if fireflies_key:
        user.fathom_api_key = None  # Mutually exclusive
if fathom_key is not None:
    user.fathom_api_key = fathom_key if fathom_key else None
    if fathom_key:
        user.fireflies_api_key = None  # Mutually exclusive
```

**Step 5: Commit**

```bash
git add backend/app/api/settings.py backend/app/schemas/settings.py
git commit -m "feat: add integration endpoints for Fireflies and Fathom"
```

---

### Task 5: Frontend - Integrations section in Settings

**Files:**
- Modify: `nextjs-frontend/app/(app)/settings/page.tsx`
- Modify: `nextjs-frontend/lib/api.ts`

**Step 1: Add integration API functions to lib/api.ts**

Add at the end of the settings section:

```typescript
export async function testIntegration(type: "fireflies" | "fathom", apiKey: string): Promise<{ connected: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/v1/settings/integrations/test?integration_type=${type}&api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error("Test failed")
  return response.json()
}

export async function updateIntegration(type: "fireflies" | "fathom", apiKey: string): Promise<{ fireflies_connected: boolean; fathom_connected: boolean }> {
  const response = await fetch(`${API_BASE}/api/v1/settings/integrations?integration_type=${type}&api_key=${encodeURIComponent(apiKey)}`, {
    method: "PUT",
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error("Update failed")
  return response.json()
}
```

**Step 2: Add integrations section to settings page**

In `nextjs-frontend/app/(app)/settings/page.tsx`:

1. Add "integrations" to the sections array (after "ghl"):

```typescript
{ id: "integrations", title: "Meeting Notes", icon: Sparkles, description: "Connect Fireflies or Fathom for call transcript context", keywords: ["fireflies", "fathom", "meeting", "transcript", "integration", "call", "notes"] },
```

2. Add state variables for integration management:

```typescript
const [firefliesKey, setFirefliesKey] = useState("")
const [fathomKey, setFathomKey] = useState("")
const [firefliesConnected, setFirefliesConnected] = useState(false)
const [fathomConnected, setFathomConnected] = useState(false)
const [testingIntegration, setTestingIntegration] = useState<string | null>(null)
```

3. Add the Integrations card section (after the GHL card). Follow the same expandable card pattern as the Account and GHL sections:

```tsx
{/* Meeting Notes Integration */}
{filteredSections.some(s => s.id === "integrations") && (
<Card className={cn(
  "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
  expandedSections.has("integrations") ? "border-[#4F8CFF]/40 shadow-md" : ""
)}>
  <button
    onClick={() => toggleSection("integrations")}
    className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
  >
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
      </div>
      <div className="text-left">
        <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Meeting Notes</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Connect Fireflies or Fathom for call transcript context</CardDescription>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {(firefliesConnected || fathomConnected) && (
        <Badge className="bg-[#3CCB7F]/10 text-[#3CCB7F] border-[#3CCB7F]/20 text-xs">
          {firefliesConnected ? "Fireflies" : "Fathom"} Connected
        </Badge>
      )}
      <ChevronRight className={cn(
        "h-5 w-5 text-[#6B7280] transition-transform",
        expandedSections.has("integrations") && "rotate-90"
      )} />
    </div>
  </button>

  {expandedSections.has("integrations") && (
    <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 border-t border-[#E5E7EB] pt-5 sm:pt-6">
      <p className="text-sm text-[#6B7280]">
        Connect your call recording tool so Revive.ai can reference meeting transcripts when writing messages. Only one can be active at a time.
      </p>

      {/* Fireflies */}
      <div className={cn(
        "p-4 rounded-lg border-2 transition-all",
        firefliesConnected ? "border-[#3CCB7F]/40 bg-[#3CCB7F]/5" : "border-[#E5E7EB]"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#111827]">Fireflies.ai</span>
            {firefliesConnected && <Badge className="bg-[#3CCB7F]/10 text-[#3CCB7F] text-[10px]">Active</Badge>}
          </div>
          {firefliesConnected && (
            <Button size="sm" variant="ghost" className="text-xs text-[#E06C75] h-7"
              onClick={async () => {
                await updateIntegration("fireflies", "")
                setFirefliesConnected(false)
                setFirefliesKey("")
                showToast.success("Disconnected", "Fireflies has been disconnected.")
              }}>
              Disconnect
            </Button>
          )}
        </div>
        {!firefliesConnected && (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Fireflies API key..."
              value={firefliesKey}
              onChange={(e) => setFirefliesKey(e.target.value)}
              className="text-sm h-9"
            />
            <Button size="sm" className="h-9 px-4"
              disabled={!firefliesKey || testingIntegration !== null}
              onClick={async () => {
                setTestingIntegration("fireflies")
                try {
                  const result = await testIntegration("fireflies", firefliesKey)
                  if (result.connected) {
                    await updateIntegration("fireflies", firefliesKey)
                    setFirefliesConnected(true)
                    setFathomConnected(false)
                    setFathomKey("")
                    showToast.success("Connected", "Fireflies is now connected. Messages will include call context.")
                  } else {
                    showToast.error("Connection failed", result.error || "Invalid API key")
                  }
                } catch { showToast.error("Error", "Failed to test connection") }
                finally { setTestingIntegration(null) }
              }}>
              {testingIntegration === "fireflies" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
            </Button>
          </div>
        )}
      </div>

      {/* Fathom */}
      <div className={cn(
        "p-4 rounded-lg border-2 transition-all",
        fathomConnected ? "border-[#3CCB7F]/40 bg-[#3CCB7F]/5" : "border-[#E5E7EB]"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#111827]">Fathom</span>
            {fathomConnected && <Badge className="bg-[#3CCB7F]/10 text-[#3CCB7F] text-[10px]">Active</Badge>}
          </div>
          {fathomConnected && (
            <Button size="sm" variant="ghost" className="text-xs text-[#E06C75] h-7"
              onClick={async () => {
                await updateIntegration("fathom", "")
                setFathomConnected(false)
                setFathomKey("")
                showToast.success("Disconnected", "Fathom has been disconnected.")
              }}>
              Disconnect
            </Button>
          )}
        </div>
        {!fathomConnected && (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Fathom API key..."
              value={fathomKey}
              onChange={(e) => setFathomKey(e.target.value)}
              className="text-sm h-9"
            />
            <Button size="sm" className="h-9 px-4"
              disabled={!fathomKey || testingIntegration !== null}
              onClick={async () => {
                setTestingIntegration("fathom")
                try {
                  const result = await testIntegration("fathom", fathomKey)
                  if (result.connected) {
                    await updateIntegration("fathom", fathomKey)
                    setFathomConnected(true)
                    setFirefliesConnected(false)
                    setFirefliesKey("")
                    showToast.success("Connected", "Fathom is now connected. Messages will include call context.")
                  } else {
                    showToast.error("Connection failed", result.error || "Invalid API key")
                  }
                } catch { showToast.error("Error", "Failed to test connection") }
                finally { setTestingIntegration(null) }
              }}>
              {testingIntegration === "fathom" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )}
</Card>
)}
```

4. Load integration status from GET /settings on mount. In the existing `loadSettings` function, add:

```typescript
setFirefliesConnected(data.fireflies_connected || false)
setFathomConnected(data.fathom_connected || false)
```

**Step 3: Commit**

```bash
git add nextjs-frontend/app/\(app\)/settings/page.tsx nextjs-frontend/lib/api.ts
git commit -m "feat: add Meeting Notes integrations section to settings page"
```

---

### Task 6: Frontend - Email vs SMS display formatting

**Files:**
- Modify: `nextjs-frontend/app/(app)/revivals/page.tsx`

**Step 1: Channel switch triggers re-generation**

When user clicks the Email/SMS/Both button and a message is already generated, re-generate with the new channel. Replace the channel button `onClick` handlers (around lines 1214, 1224, 1234):

```typescript
// For each channel button, replace:
onClick={() => setMessageChannel("sms")}
// With:
onClick={() => {
  const newChannel = "sms"  // or "email" or "both"
  setMessageChannel(newChannel)
  if (selectedDeal && generatedMessage) {
    // Re-generate with new channel
    handleGenerateMessage(selectedDeal)
  }
}}
```

But since `handleGenerateMessage` uses `messageChannel` state which hasn't updated yet (React batching), we need a slightly different approach. Add a `useEffect` that re-generates when channel changes:

```typescript
const [prevChannel, setPrevChannel] = useState(messageChannel)

useEffect(() => {
  if (messageChannel !== prevChannel && selectedDeal && generatedMessage) {
    setPrevChannel(messageChannel)
    handleGenerateMessage(selectedDeal)
  } else {
    setPrevChannel(messageChannel)
  }
}, [messageChannel])  // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 2: Distinct email display layout**

Replace the message display section (around lines 1160-1202) with channel-aware rendering.

Wrap the existing display in a check: if channel is "email", show the email layout; otherwise keep existing SMS bubble layout.

Email layout:

```tsx
{/* Email display */}
{messageChannel === "email" && emailSubject && (
  <div className="border-2 border-primary/20 rounded-xl overflow-hidden shadow-sm">
    {/* Email header */}
    <div className="bg-muted/40 px-5 py-3 border-b border-primary/10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Mail className="h-3 w-3" />
        <span>Email Preview</span>
      </div>
      <p className="text-sm font-medium text-foreground">
        Subject: {emailSubject}
      </p>
    </div>
    {/* Email body */}
    <div className="px-5 py-4 bg-white">
      {(editedMessage || generatedMessage).split("\n\n").map((paragraph, idx) => (
        <p key={idx} className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">
          {paragraph.split("\n").map((line, lineIdx) => (
            <span key={lineIdx}>
              {line}
              {lineIdx < paragraph.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  </div>
)}
```

The existing SMS bubble display stays for `messageChannel === "sms"`. For `messageChannel === "both"`, show both previews stacked.

**Step 3: Commit**

```bash
git add nextjs-frontend/app/\(app\)/revivals/page.tsx
git commit -m "feat: channel-aware message display with email formatting and re-generation on channel switch"
```

---

### Task 7: Delete static fireflies_cache.json

**Files:**
- Delete: `backend/fireflies_cache.json`

**Step 1: Remove the file**

```bash
git rm backend/fireflies_cache.json
git commit -m "chore: remove static fireflies cache, replaced by live API integration"
```

---

### Task 8: Deploy and verify

**Step 1: Deploy backend**

```bash
cd backend && npx vercel --prod
```

**Step 2: Deploy frontend**

```bash
cd nextjs-frontend && npx vercel --prod
```

**Step 3: Verify**

1. Open settings page — confirm "Meeting Notes" section appears
2. Enter Fireflies API key — test connection
3. Go to Revivals — generate a message for a deal
4. Check that message references call transcript content
5. Switch to Email channel — confirm message re-generates with email format
6. Verify email display shows subject line header + paragraph layout

**Step 4: Final commit**

```bash
git push origin main
```
