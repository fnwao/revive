# Mock GHL Service

The mock GHL service allows you to test the full application flow without needing real GoHighLevel API access.

## Configuration

Set `USE_MOCK_GHL=true` in your `.env` file (default is `True`):

```bash
USE_MOCK_GHL=true  # Use mock service (no real API calls)
# OR
USE_MOCK_GHL=false  # Use real GHL API (requires credentials)
```

## Mock Data

### Mock Deals

The mock service includes 5 sample deals:

- **deal-001**: Acme Corp - $5,000 (stalled - 10 days inactive)
- **deal-002**: TechStart Inc - $2,000 (active - 3 days inactive)
- **deal-003**: Global Solutions - $10,000 (stalled - 12 days inactive)
- **deal-004**: SmallBiz LLC - $1,000 (active - 1 day inactive)
- **deal-005**: MegaCorp - $25,000 (stalled - 8 days inactive)

### Mock Conversations

Each deal has 5-15 randomly generated SMS conversations spread over the last 30 days, including:
- Initial outreach messages
- Follow-up questions
- Scheduling messages
- Proposal discussions

## Usage

The mock service implements the same interface as the real GHL service, so your code doesn't need to change:

```python
from app.services.ghl import get_ghl_service

# This will return GHLMockService if USE_MOCK_GHL=true
ghl_service = get_ghl_service(user)

# All methods work the same
deal = await ghl_service.get_deal("deal-001")
conversations = await ghl_service.get_deal_conversations("deal-001")
```

## Mock Service Behavior

### `get_deal(deal_id)`
- Returns deal data from mock deals list
- Returns `None` if deal not found (like real API)

### `get_deals_by_pipeline(pipeline_id)`
- Returns all deals in the specified pipeline
- Mock deals use `pipeline-001` and `pipeline-002`

### `get_deal_conversations(deal_id, limit=20)`
- Generates 5-15 realistic SMS conversations
- Messages spread over last 30 days
- Mix of inbound/outbound messages
- Returns conversations sorted by date (newest first)

### `send_sms(contact_id, message)`
- **Does NOT actually send SMS**
- Logs the message to console
- Returns `True` (simulating success)

### `sync_deal_to_db(db, ghl_deal_data)`
- Works exactly like real service
- Syncs deal data to database

## Testing with Mock Data

### Example: Detect Stalled Deals

```python
# Get all deals in pipeline
deals = await ghl_service.get_deals_by_pipeline("pipeline-001")

# Filter stalled deals (7+ days inactive)
from datetime import datetime, timedelta
stalled = [
    deal for deal in deals
    if datetime.fromisoformat(deal["lastActivityDate"].replace("Z", "+00:00")) 
    < datetime.now() - timedelta(days=7)
]

# Should find: deal-001, deal-003, deal-005
```

### Example: Get Conversations

```python
# Get conversation history
conversations = await ghl_service.get_deal_conversations("deal-001", limit=10)

# Returns list of messages with:
# - id, messageId, contactId, dealId
# - type: "sms"
# - direction: "inbound" or "outbound"
# - content: message text
# - sentAt, createdAt: timestamps
```

## Switching to Real GHL API

When you have GHL API credentials:

1. Set `USE_MOCK_GHL=false` in `.env`
2. Ensure user has `ghl_access_token` and `ghl_location_id` set
3. All code continues to work - just swap the service

The factory function `get_ghl_service()` handles the switch automatically.

## Mock Service Logging

The mock service logs all operations with `[MOCK]` prefix:

```
[MOCK] Fetching deal: deal-001
[MOCK] Fetching conversations for deal: deal-001, limit: 20
[MOCK] Sending SMS to contact contact-001: Hi! Just following up...
[MOCK] ✅ SMS would be sent: Hi! Just following up...
```

This makes it clear when mock vs real API is being used.

## Limitations

The mock service:
- ✅ Returns realistic data structure
- ✅ Simulates API delays (100ms)
- ✅ Works with all existing code
- ❌ Does NOT actually send SMS
- ❌ Does NOT sync with real GHL data
- ❌ Does NOT handle webhook events from GHL

For full testing, you'll need real GHL API access eventually, but the mock service lets you build and test the core logic first.

