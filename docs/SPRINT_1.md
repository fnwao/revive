# Sprint 1: Foundation & Mock Implementation

**Goal:** Build core infrastructure and endpoints with mocked GHL data so we can test the full flow without GHL API access.

**Duration:** 1 week  
**Prerequisites:** None (no GHL API needed)

---

## Sprint Backlog

### ✅ **Task 1: Database Migrations (Alembic)**
**Priority:** Critical  
**Time:** 2-3 hours

**Acceptance Criteria:**
- [ ] Alembic initialized and configured
- [ ] Initial migration created from existing models
- [ ] Can run `alembic upgrade head` to create tables
- [ ] Can run `alembic downgrade -1` to rollback
- [ ] Remove `init_db()` from `main.py` startup

**Files to create/modify:**
- `alembic/env.py` - Configure to use our models
- `alembic/versions/001_initial.py` - Initial migration
- `app/main.py` - Remove init_db() call

---

### ✅ **Task 2: API Key Authentication**
**Priority:** Critical  
**Time:** 3-4 hours

**Acceptance Criteria:**
- [ ] API key generation utility (hash with bcrypt)
- [ ] FastAPI dependency for auth: `get_current_user()`
- [ ] All endpoints protected (except `/health`, `/`, `/docs`)
- [ ] Admin script to create users and generate API keys
- [ ] Test: Unauthenticated requests return 401
- [ ] Test: Authenticated requests work

**Files to create/modify:**
- `app/core/auth.py` - Auth utilities and dependencies
- `app/api/deals.py` - Protected endpoints (new file)
- `app/api/approvals.py` - Protected endpoints (new file)
- `scripts/create_user.py` - Admin script to create users
- Update all existing endpoints to use auth

---

### ✅ **Task 3: Mock GHL Service**
**Priority:** High  
**Time:** 2-3 hours

**Acceptance Criteria:**
- [ ] Mock GHL service that returns fake data
- [ ] Same interface as real GHL service
- [ ] Returns realistic deal/conversation data
- [ ] Can toggle between mock and real via config
- [ ] Test endpoints work with mock data

**Files to create/modify:**
- `app/services/ghl_mock.py` - Mock implementation
- `app/services/ghl.py` - Add mock mode toggle
- `app/config.py` - Add `USE_MOCK_GHL` flag

**Mock Data to Return:**
- Fake deals with various statuses
- Fake conversations (SMS messages)
- Realistic timestamps (some stalled, some active)

---

### ✅ **Task 4: Deal Detection Endpoint**
**Priority:** High  
**Time:** 3-4 hours

**Acceptance Criteria:**
- [ ] `POST /api/v1/deals/detect-stalled` endpoint
- [ ] Accepts `pipeline_id` or list of `deal_ids`
- [ ] Returns list of stalled deals
- [ ] Stalled = `last_activity_date < (now - 7 days)`
- [ ] Works with mock GHL service
- [ ] Proper error handling
- [ ] API documentation complete

**Files to create/modify:**
- `app/api/deals.py` - New file with deal endpoints
- `app/schemas/deal.py` - Request/response schemas
- `app/services/deal_detection.py` - Business logic

**Request Schema:**
```json
{
  "pipeline_id": "optional-pipeline-id",
  "deal_ids": ["optional", "list", "of", "deal", "ids"],
  "stalled_threshold_days": 7  // optional, default 7
}
```

**Response Schema:**
```json
{
  "stalled_deals": [
    {
      "deal_id": "deal-123",
      "title": "Acme Corp Deal",
      "status": "active",
      "value": 5000.00,
      "last_activity_date": "2024-01-01T00:00:00Z",
      "days_since_activity": 10
    }
  ],
  "total_found": 1
}
```

---

### ✅ **Task 5: Message Generation Endpoint**
**Priority:** High  
**Time:** 4-5 hours

**Acceptance Criteria:**
- [ ] `POST /api/v1/deals/{deal_id}/generate-message` endpoint
- [ ] Fetches deal + last 10-20 conversations (from mock)
- [ ] Calls OpenAI GPT-4 API
- [ ] Stores message in `approval_queue` table
- [ ] Returns generated message
- [ ] Works with mock conversation data
- [ ] Proper error handling

**Files to create/modify:**
- `app/api/deals.py` - Add generate-message endpoint
- `app/services/ai.py` - OpenAI integration
- `app/schemas/message.py` - Request/response schemas
- `app/services/ghl_mock.py` - Add mock conversations

**Request:** None (deal_id from path)

**Response:**
```json
{
  "approval_id": "uuid-here",
  "deal_id": "deal-123",
  "generated_message": "Hi John, wanted to follow up on...",
  "status": "pending",
  "created_at": "2024-01-11T00:00:00Z"
}
```

**OpenAI Prompt Template:**
```
You are a sales rep reactivating a stalled deal. 

Deal Context:
- Title: {deal_title}
- Value: ${deal_value}
- Status: {deal_status}
- Last Activity: {last_activity_date} ({days_ago} days ago)

Recent Conversation History:
{conversation_history}

Generate a short, professional SMS message (160 chars max) to reactivate this deal. 
Be conversational, reference prior conversation naturally, and create urgency without being pushy.
```

---

### ✅ **Task 6: Approval Queue Endpoints**
**Priority:** Medium  
**Time:** 3-4 hours

**Acceptance Criteria:**
- [ ] `GET /api/v1/approvals` - List pending approvals
- [ ] `POST /api/v1/approvals/{id}/approve` - Approve message
- [ ] `POST /api/v1/approvals/{id}/reject` - Reject message
- [ ] `POST /api/v1/approvals/{id}/send` - Send with optional edits
- [ ] On send: call mock GHL service (log instead of real send)
- [ ] Update approval status in DB
- [ ] Filter by status, deal_id, date range

**Files to create/modify:**
- `app/api/approvals.py` - New file with approval endpoints
- `app/schemas/approval.py` - Request/response schemas
- `app/services/approval.py` - Business logic

**Endpoints:**
- `GET /api/v1/approvals?status=pending&limit=10`
- `POST /api/v1/approvals/{id}/approve`
- `POST /api/v1/approvals/{id}/reject`
- `POST /api/v1/approvals/{id}/send` (body: `{"edited_message": "optional"}`)

---

### ✅ **Task 7: End-to-End Test Script**
**Priority:** Medium  
**Time:** 2 hours

**Acceptance Criteria:**
- [ ] Script that tests full flow with mock data
- [ ] Creates user, generates API key
- [ ] Detects stalled deals
- [ ] Generates message
- [ ] Approves and "sends" message
- [ ] All steps work without GHL API

**Files to create:**
- `scripts/test_full_flow.py` - End-to-end test script

**Test Flow:**
1. Create user via script
2. Get API key
3. Call detect-stalled endpoint
4. Call generate-message for a stalled deal
5. List approvals
6. Approve message
7. Verify message "sent" (logged, not actually sent)

---

## Implementation Order

1. **Day 1:** Tasks 1 & 2 (Migrations + Auth)
2. **Day 2:** Task 3 (Mock GHL Service)
3. **Day 3:** Tasks 4 & 5 (Deal Detection + Message Generation)
4. **Day 4:** Task 6 (Approval Endpoints)
5. **Day 5:** Task 7 (Testing + Polish)

---

## Mock Data Strategy

### Mock Deals
Return 5-10 fake deals with:
- Mix of active/stalled statuses
- Various last_activity_dates (some < 7 days, some > 7 days)
- Different deal values
- Realistic deal titles

### Mock Conversations
Return 10-15 fake SMS messages:
- Mix of inbound/outbound
- Realistic timestamps (spread over last 30 days)
- Varied content (questions, responses, follow-ups)
- Some deals with many messages, some with few

### Mock GHL Service Interface
```python
class GHLService:
    async def get_deal(deal_id: str) -> Dict
    async def get_deal_conversations(deal_id: str) -> List[Dict]
    async def send_sms(contact_id: str, message: str) -> bool
    def sync_deal_to_db(db, ghl_deal_data) -> Deal
```

Both real and mock implement same interface.

---

## Testing Without GHL API

### What We Can Test:
✅ Full API flow (detect → generate → approve → send)  
✅ Database operations  
✅ Authentication  
✅ OpenAI integration  
✅ Business logic (stalled detection, message generation)  
✅ Error handling  

### What We Can't Test:
❌ Real GHL API responses  
❌ Real webhook events  
❌ Actual SMS sending  

### Workaround:
- Use mock GHL service for all GHL calls
- Log "sent" messages instead of actually sending
- Test with realistic fake data
- When GHL API is available, swap mock for real service

---

## Success Criteria

**Sprint is complete when:**
1. ✅ All endpoints work with mock data
2. ✅ Full user flow works end-to-end
3. ✅ Database migrations are set up
4. ✅ Authentication protects all endpoints
5. ✅ OpenAI integration generates messages
6. ✅ Approval system works
7. ✅ Test script validates full flow

**Ready for:**
- Real GHL API integration (swap mock for real)
- User testing with mock data
- Frontend development (can build against API)

---

## Files to Create

```
backend/
├── alembic/
│   ├── env.py (configure)
│   └── versions/
│       └── 001_initial.py
├── app/
│   ├── core/
│   │   └── auth.py (new)
│   ├── api/
│   │   ├── deals.py (new)
│   │   └── approvals.py (new)
│   ├── schemas/
│   │   ├── deal.py (new)
│   │   ├── message.py (new)
│   │   └── approval.py (new)
│   ├── services/
│   │   ├── ghl_mock.py (new)
│   │   ├── ai.py (new)
│   │   ├── deal_detection.py (new)
│   │   └── approval.py (new)
│   └── main.py (update - remove init_db)
├── scripts/
│   ├── create_user.py (new)
│   └── test_full_flow.py (new)
```

---

## Estimated Time

**Total:** ~20-25 hours of focused development

**Breakdown:**
- Migrations: 2-3h
- Auth: 3-4h
- Mock GHL: 2-3h
- Deal Detection: 3-4h
- Message Generation: 4-5h
- Approvals: 3-4h
- Testing: 2h
- Polish/Bug fixes: 2-3h

---

## Next Sprint (After GHL API Access)

**Sprint 2: Real GHL Integration**
- Replace mock with real GHL service
- Implement OAuth flow
- Test with real GHL account
- Handle real webhook events
- Test actual SMS sending

