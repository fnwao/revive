# Revive.ai - V1 Minimal Feature Set

## Core Value Proposition
**"Automatically detect stalled deals in GoHighLevel and send context-aware reactivation messages with human approval."**

Everything else is cut for V1.

---

## What Must Be Built

### 1. **GoHighLevel Integration** ✅
**Must have:**
- OAuth connection flow (user authorizes GHL access)
- Store GHL API credentials securely
- Read deals from GHL (deal ID, status, pipeline, value, last activity date)
- Read conversation history (SMS only for V1)
- Send SMS messages via GHL API
- Basic error handling (rate limits, auth failures)

**Implementation:**
- GHL OAuth endpoint
- GHL API client service
- Credential storage in PostgreSQL

**Why essential:** Can't function without GHL connection.

---

### 2. **Stalled Deal Detection** ✅
**Must have:**
- Single detection rule: **"Deal in active pipeline with no activity for 7+ days"**
- Manual trigger only (no scheduled scans for V1)
- User provides: deal ID or pipeline ID
- System checks: last activity date, current status
- Returns: list of stalled deals

**Implementation:**
- API endpoint: `POST /api/v1/deals/detect-stalled`
- Query GHL for deal details
- Compare `last_activity_date` to threshold (7 days, configurable)
- Return JSON list of stalled deals

**Why essential:** Core value - finding deals that need attention.

**What's simplified:**
- Only one rule (time-based)
- No ML-based detection
- No deal value filtering (check all deals)
- Manual trigger (user calls API)

---

### 3. **Context-Aware Message Generation** ✅
**Must have:**
- Read last 10-20 SMS messages from deal conversation
- Generate reactivation message using GPT-4
- Include: deal context, prior conversation, basic personalization
- Return generated message (don't send yet)

**Implementation:**
- API endpoint: `POST /api/v1/deals/{deal_id}/generate-message`
- Fetch conversation history from GHL
- Call OpenAI GPT-4 with prompt:
  - System: "You are a sales rep reactivating a stalled deal..."
  - Context: Deal details, last 10 messages, deal value
  - Output: Single SMS message (160 chars or less)
- Return message text

**Why essential:** Core value - AI-generated, context-aware messages.

**What's simplified:**
- No knowledge base (use hardcoded prompt templates)
- No style learning (use default professional tone)
- No vector DB (just pass last N messages to LLM)
- SMS only (no email)
- Simple prompt (no complex reasoning)

---

### 4. **Human Approval System** ✅
**Must have:**
- Store generated message in approval queue
- API to list pending approvals
- API to approve/reject/edit message
- On approval: send message via GHL
- On reject: discard message
- On edit: send edited version

**Implementation:**
- Database table: `approval_queue` (deal_id, message, status, created_at)
- API endpoints:
  - `GET /api/v1/approvals` - List pending
  - `POST /api/v1/approvals/{id}/approve` - Approve as-is
  - `POST /api/v1/approvals/{id}/reject` - Reject
  - `POST /api/v1/approvals/{id}/send` - Send with edits (optional edit field)
- On approve: call GHL API to send SMS

**Why essential:** Required for trust and control.

**What's simplified:**
- No email notifications (user polls API)
- No webhook callbacks
- No approval rules (all messages require approval)
- Simple JSON API (no UI)

---

### 5. **Basic API Authentication** ✅
**Must have:**
- API key generation per user
- Store hashed keys in database
- Middleware to validate `Authorization: Bearer <key>` header
- Protected routes (all endpoints except health check)

**Implementation:**
- `users` table: id, email, api_key_hash, created_at
- Admin script to create users and generate keys
- FastAPI dependency for auth
- Return 401 if invalid key

**Why essential:** Security requirement.

---

## What Is Fake or Stubbed

### 1. **Knowledge Base** 🟡 STUBBED
**What we fake:**
- Hardcoded prompt templates in code
- No document upload/ingestion
- No vector search over KB
- System prompt includes: "Use professional, consultative tone. Reference prior conversation naturally."

**Why stub:** Can deliver value without it. Add in V2.

**How to upgrade later:**
- Add document upload endpoint
- Add vector DB for KB storage
- Enhance prompt with retrieved KB chunks

---

### 2. **Style Learning** 🟡 STUBBED
**What we fake:**
- Default professional tone in system prompt
- No analysis of user's past messages
- No style embeddings
- Generic: "Match the communication style of prior messages"

**Why stub:** Good enough for V1. Users can edit messages anyway.

**How to upgrade later:**
- Analyze user's sent messages
- Store style patterns
- Enhance prompt with style examples

---

### 3. **Vector Database** 🟡 STUBBED
**What we fake:**
- No vector DB at all
- Just pass last N messages directly to LLM
- No semantic search
- No conversation embeddings

**Why stub:** LLM can handle last 10-20 messages in context. Vector DB adds complexity.

**How to upgrade later:**
- Add Qdrant for conversation history
- Embed and store messages
- Semantic search for relevant context

---

### 4. **Scheduled Scans** 🟡 STUBBED
**What we fake:**
- No cron jobs
- No background workers for detection
- User manually calls API to detect stalled deals
- User manually triggers message generation

**Why stub:** Manual is fine for V1. Proves value before automation.

**How to upgrade later:**
- Add Celery scheduled task
- Auto-detect every 6-12 hours
- Auto-generate messages for stalled deals

---

### 5. **Background Job Queue** 🟡 STUBBED
**What we fake:**
- All operations synchronous
- API calls block until complete
- No Celery workers
- No Redis queue

**Why stub:** For V1, synchronous is fine. GHL API + OpenAI API calls take 5-15 seconds total.

**How to upgrade later:**
- Add Celery + Redis
- Make detection async
- Make message generation async
- Add job status tracking

---

### 6. **Email Support** 🟡 STUBBED
**What we fake:**
- SMS only
- No email reading
- No email sending
- No email templates

**Why stub:** SMS is simpler, covers 80% of use cases.

**How to upgrade later:**
- Add email reading from GHL
- Add email sending
- Support both SMS and email

---

### 7. **Deal Value Filtering** 🟡 STUBBED
**What we fake:**
- Process all deals, regardless of value
- No minimum value threshold
- User can filter manually if needed

**Why stub:** Simpler logic. User can choose which deals to process.

**How to upgrade later:**
- Add configurable minimum deal value
- Auto-skip low-value deals

---

### 8. **Multiple Detection Rules** 🟡 STUBBED
**What we fake:**
- Only one rule: "No activity for 7+ days"
- No custom rules
- No ML-based detection
- No multiple rule types

**Why stub:** One rule proves the concept. Add more in V2.

**How to upgrade later:**
- Add configurable rules
- Add multiple rule types
- Add rule combinations

---

## What Is Explicitly Cut

### 1. **Knowledge Base Ingestion** ❌ CUT
- No document upload
- No PDF/DOCX parsing
- No document chunking
- No vector storage of KB

**Why cut:** Hardcoded prompts work for V1. Add in V2.

---

### 2. **Style Learning** ❌ CUT
- No analysis of user's communication style
- No style embeddings
- No style matching

**Why cut:** Default tone is fine. Users can edit messages.

---

### 3. **Vector Database** ❌ CUT
- No Qdrant/Pinecone
- No embeddings
- No semantic search

**Why cut:** LLM context window handles last 10-20 messages. Add later for scale.

---

### 4. **Scheduled Automation** ❌ CUT
- No cron jobs
- No automatic detection
- No automatic message generation
- No background workers

**Why cut:** Manual triggers prove value first. Automation in V2.

---

### 5. **Job Queue System** ❌ CUT
- No Celery
- No Redis
- No async processing
- No job status tracking

**Why cut:** Synchronous is fine for V1. Add when scale requires it.

---

### 6. **Email Support** ❌ CUT
- No email reading
- No email sending
- SMS only

**Why cut:** SMS covers most use cases. Email in V2.

---

### 7. **Webhook Receiver** ❌ CUT
- No GHL webhook handling
- No real-time event processing
- Manual API calls only

**Why cut:** Manual triggers are simpler. Webhooks in V2.

---

### 8. **User Dashboard/UI** ❌ CUT
- No web interface
- No React/Vue frontend
- API-only (JSON)

**Why cut:** API is faster to build. UI in V2.

---

### 9. **Analytics/Metrics** ❌ CUT
- No dashboards
- No success tracking
- No revenue attribution
- No message performance metrics

**Why cut:** Not core value. Add when users ask for it.

---

### 10. **Multi-CRM Support** ❌ CUT
- GoHighLevel only
- No HubSpot, Salesforce, etc.

**Why cut:** Explicitly stated non-goal. GHL only for V1.

---

### 11. **Cold Outbound** ❌ CUT
- Only reactivation (existing deals)
- No new lead generation
- No cold prospecting

**Why cut:** Explicitly stated non-goal. Reactivation only.

---

### 12. **Enterprise Features** ❌ CUT
- No team management
- No role-based access
- No multi-account support
- Single user per API key

**Why cut:** V1 is single-user focused. Enterprise in V2+.

---

## V1 User Flow

### Setup (One-time)
1. Admin creates user account (script)
2. User gets API key
3. User connects GHL via OAuth (one-time)

### Daily Usage
1. **User calls API**: `POST /api/v1/deals/detect-stalled` with pipeline_id
2. **System returns**: List of stalled deals (deal_id, last_activity_date)
3. **User picks deal**: Calls `POST /api/v1/deals/{deal_id}/generate-message`
4. **System generates**: Message appears in approval queue
5. **User reviews**: Calls `GET /api/v1/approvals` to see pending
6. **User approves**: Calls `POST /api/v1/approvals/{id}/approve`
7. **System sends**: Message sent via GHL SMS API
8. **Done**: Deal reactivated

**Time per deal: 2-3 minutes** (mostly waiting for API calls)

---

## V1 API Endpoints

### Authentication
- `POST /api/v1/auth/connect-ghl` - OAuth flow initiation
- `GET /api/v1/auth/callback` - OAuth callback

### Deals
- `POST /api/v1/deals/detect-stalled` - Find stalled deals (manual)
- `GET /api/v1/deals/{deal_id}` - Get deal details
- `GET /api/v1/deals/{deal_id}/conversation` - Get conversation history

### Messages
- `POST /api/v1/deals/{deal_id}/generate-message` - Generate reactivation message

### Approvals
- `GET /api/v1/approvals` - List pending approvals
- `POST /api/v1/approvals/{id}/approve` - Approve message
- `POST /api/v1/approvals/{id}/reject` - Reject message
- `POST /api/v1/approvals/{id}/send` - Send with edits (optional)

### Health
- `GET /health` - Health check (no auth)

**Total: ~10 endpoints**

---

## V1 Database Schema

### `users`
- `id` (UUID, PK)
- `email` (string)
- `api_key_hash` (string)
- `ghl_access_token` (encrypted)
- `ghl_refresh_token` (encrypted)
- `created_at` (timestamp)

### `deals` (cache)
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `ghl_deal_id` (string, unique)
- `last_activity_date` (timestamp)
- `status` (string)
- `value` (decimal)
- `updated_at` (timestamp)

### `approval_queue`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `deal_id` (UUID, FK)
- `ghl_deal_id` (string)
- `message` (text)
- `status` (enum: pending, approved, rejected, sent)
- `created_at` (timestamp)
- `approved_at` (timestamp, nullable)

**Total: 3 tables**

---

## V1 Tech Stack (Simplified)

- **Backend**: Python + FastAPI (synchronous, no async needed)
- **Database**: PostgreSQL (3 tables)
- **LLM**: OpenAI GPT-4 (direct API calls)
- **Auth**: API keys (simple)
- **Hosting**: Railway (single service, no workers)

**What's removed from full stack:**
- ❌ Celery (no background jobs)
- ❌ Redis (no queue)
- ❌ Qdrant (no vector DB)
- ❌ Async/await complexity (synchronous only)

---

## Success Criteria for V1

1. ✅ User can connect GHL account
2. ✅ User can detect stalled deals (manual API call)
3. ✅ System generates context-aware message (uses conversation history)
4. ✅ User can approve/reject message before sending
5. ✅ Message sends via GHL SMS API
6. ✅ End-to-end flow works (detect → generate → approve → send)

**If all 6 work, V1 is complete.**

---

## V1 Development Estimate

**Week 1:**
- GHL OAuth + API client
- Basic API structure + auth
- Database setup

**Week 2:**
- Stalled deal detection
- Message generation (GPT-4)
- Approval system

**Week 3:**
- End-to-end testing
- Error handling
- Documentation

**Total: 3 weeks to working MVP**

---

## What Gets Added in V2

1. **Automation**: Scheduled scans, background workers
2. **Knowledge Base**: Document upload, vector search
3. **Style Learning**: Analyze and match user's style
4. **Email Support**: Read and send emails
5. **Webhooks**: Real-time event processing
6. **UI Dashboard**: Web interface for approvals
7. **Analytics**: Basic success metrics

**But V1 proves the core value first.**

