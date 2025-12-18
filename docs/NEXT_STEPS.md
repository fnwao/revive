# Next Steps - Development Roadmap

## Priority Order (Build in this sequence)

### 🔴 **Phase 1: Foundation (Week 1)**

#### 1.1 Database Migrations (Alembic)
**Why first:** Need proper DB schema management before building features.

**Tasks:**
- [ ] Initialize Alembic: `alembic init alembic`
- [ ] Configure `alembic/env.py` to use our models
- [ ] Create initial migration from existing models
- [ ] Test migration up/down
- [ ] Remove `init_db()` from startup (use migrations instead)

**Time:** 2-3 hours

---

#### 1.2 API Key Authentication
**Why second:** All endpoints need auth. Can't test features without it.

**Tasks:**
- [ ] Create API key generation utility (hash with bcrypt)
- [ ] Create auth dependency for FastAPI routes
- [ ] Add `get_current_user()` dependency
- [ ] Protect all endpoints (except health, OAuth callbacks)
- [ ] Create admin script to generate API keys for users
- [ ] Test auth on webhook endpoint

**Time:** 3-4 hours

---

#### 1.3 GHL OAuth Flow
**Why third:** Users need to connect GHL before we can fetch deals.

**Tasks:**
- [ ] Research GHL OAuth flow (docs)
- [ ] Create OAuth initiation endpoint: `GET /api/v1/auth/ghl/connect`
- [ ] Create OAuth callback endpoint: `GET /api/v1/auth/ghl/callback`
- [ ] Store access/refresh tokens in User model
- [ ] Add token refresh logic
- [ ] Test OAuth flow end-to-end

**Time:** 4-6 hours

---

### 🟡 **Phase 2: Core Features (Week 2)**

#### 2.1 Deal Detection Endpoint
**Why first:** First user-facing value feature.

**Tasks:**
- [ ] Create endpoint: `POST /api/v1/deals/detect-stalled`
- [ ] Accept `pipeline_id` or `deal_id` in request
- [ ] Fetch deals from GHL API
- [ ] Implement stalled logic: `last_activity_date < (now - 7 days)`
- [ ] Return list of stalled deals with metadata
- [ ] Add error handling for GHL API failures
- [ ] Test with real GHL account

**Time:** 4-5 hours

---

#### 2.2 Conversation Sync
**Why second:** Need conversation history for message generation.

**Tasks:**
- [ ] Complete `sync_conversations` Celery task
- [ ] Fetch SMS messages from GHL API
- [ ] Store in `conversations` table
- [ ] Update `deal.last_contact_date`
- [ ] Handle pagination if GHL API requires it
- [ ] Test with real conversation data

**Time:** 3-4 hours

---

#### 2.3 Message Generation Endpoint
**Why third:** Core AI feature - generates reactivation messages.

**Tasks:**
- [ ] Create endpoint: `POST /api/v1/deals/{deal_id}/generate-message`
- [ ] Fetch deal + last 10-20 conversations
- [ ] Create OpenAI prompt with context
- [ ] Call GPT-4 API
- [ ] Store generated message in `approval_queue`
- [ ] Return message to user
- [ ] Add error handling for OpenAI API
- [ ] Test message quality

**Time:** 5-6 hours

---

### 🟢 **Phase 3: Approval System (Week 3)**

#### 3.1 Approval Queue Endpoints
**Why:** Complete the user flow - approve before sending.

**Tasks:**
- [ ] `GET /api/v1/approvals` - List pending approvals
- [ ] `POST /api/v1/approvals/{id}/approve` - Approve message
- [ ] `POST /api/v1/approvals/{id}/reject` - Reject message
- [ ] `POST /api/v1/approvals/{id}/send` - Send with optional edits
- [ ] On approve: call GHL API to send SMS
- [ ] Update approval status in DB
- [ ] Test full flow: generate → approve → send

**Time:** 4-5 hours

---

#### 3.2 End-to-End Testing
**Why:** Verify the complete MVP works.

**Tasks:**
- [ ] Test full user flow:
  1. Connect GHL account
  2. Detect stalled deals
  3. Generate message
  4. Approve message
  5. Verify message sent in GHL
- [ ] Test error cases (API failures, invalid data)
- [ ] Test edge cases (no conversations, very old deals)
- [ ] Document API usage

**Time:** 3-4 hours

---

## Quick Wins (Can do anytime)

### Immediate Value
- [ ] Add request/response logging
- [ ] Add rate limiting middleware
- [ ] Create API documentation examples
- [ ] Add error response schemas
- [ ] Set up basic monitoring (health checks)

### Nice to Have
- [ ] Add webhook signature verification
- [ ] Add retry logic for GHL API calls
- [ ] Cache GHL API responses (5-10 min)
- [ ] Add deal value filtering option
- [ ] Add configurable stalled threshold (not hardcoded 7 days)

---

## Blockers & Dependencies

### Need Before Starting
1. **GHL API Credentials**
   - OAuth client ID/secret
   - API documentation access
   - Test GHL account

2. **OpenAI API Key**
   - Account with GPT-4 access
   - API key for testing

3. **Database Running**
   - Docker Compose services
   - Or managed PostgreSQL instance

---

## Recommended Next Action

**Start with: Database Migrations (1.1)**

This is the foundation. Everything else depends on having a proper database schema management system.

**Command to start:**
```bash
cd backend
alembic init alembic
# Then configure and create initial migration
```

---

## Estimated Timeline

- **Week 1:** Foundation (Migrations, Auth, OAuth) - ~12 hours
- **Week 2:** Core Features (Detection, Sync, Generation) - ~12 hours  
- **Week 3:** Approval System + Testing - ~8 hours

**Total: ~32 hours of focused development**

This gets you to a working MVP that delivers real value.

