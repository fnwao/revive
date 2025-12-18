# Revive.ai - V1 System Architecture

## Overview
Revive.ai is a background revenue recovery system that monitors GoHighLevel pipelines, detects stalled deals, and automatically re-engages them using AI-generated, context-aware messages.

## Core Services & Components

### 1. **Webhook Receiver** (Sync)
- **Purpose**: Receives and validates webhooks from GoHighLevel
- **Tech**: Express/FastAPI endpoint
- **Responsibilities**:
  - Verify webhook signatures
  - Parse GHL events (deal updates, new messages, status changes)
  - Enqueue jobs for async processing
  - Return 200 immediately (fire-and-forget)
- **Why Sync**: GHL expects fast acknowledgment

### 2. **Job Queue** (Async)
- **Purpose**: Manages background processing tasks
- **Tech**: BullMQ (Node.js) or Celery (Python) with Redis
- **Job Types**:
  - `analyze_deal` - Check if deal is stalled
  - `generate_message` - Create reactivation message
  - `ingest_knowledge_base` - Process uploaded documents
  - `learn_style` - Analyze communication patterns
- **Why Async**: AI processing takes time; don't block webhooks

### 3. **GHL Integration Service** (Sync/Async)
- **Purpose**: Single source of truth for GHL API calls
- **Tech**: Service layer wrapping GHL SDK
- **Responsibilities**:
  - Fetch deal details, contacts, pipelines
  - Retrieve conversation history (SMS, email, calls, transcripts)
  - Send messages (SMS, email)
  - Update deal status/notes
- **Caching**: Cache deal/contact data for 5-10 minutes to reduce API calls
- **Rate Limiting**: Respect GHL API limits

### 4. **Memory Service** (Async)
- **Purpose**: Stores and retrieves context (conversations, KB, style)
- **Tech**: Vector DB (Pinecone/Qdrant/Weaviate) + PostgreSQL
- **Storage Strategy**:
  - **Vector DB**: 
    - Conversation embeddings (last 50 messages per deal)
    - Knowledge base document chunks
    - Style examples (user's past messages)
  - **PostgreSQL**:
    - Deal metadata (ID, status, last contact date)
    - User configurations
    - Approval queue
    - Job status tracking
- **Retrieval**: Semantic search for relevant context when generating messages

### 5. **AI Service** (Async)
- **Purpose**: LLM orchestration for reasoning and message generation
- **Tech**: OpenAI API (GPT-4) or Anthropic (Claude)
- **Responsibilities**:
  - Analyze deal context (is it stalled? why?)
  - Generate reactivation messages using:
    - Prior conversation history
    - Knowledge base (offers, scripts, FAQs)
    - Learned communication style
    - Deal-specific context
  - Determine if human approval needed (high-value deals, sensitive situations)
- **Prompt Engineering**: System prompts that enforce style consistency

### 6. **Knowledge Base Ingestion** (Async)
- **Purpose**: Process and index user-uploaded documents
- **Tech**: Background job + embedding service
- **Flow**:
  1. User uploads docs (PDF, DOCX, TXT) via API
  2. Extract text, chunk into 500-1000 token pieces
  3. Generate embeddings
  4. Store in vector DB with metadata (user_id, doc_type, upload_date)
- **Why Async**: Document processing can take time

### 7. **Style Learning Service** (Async)
- **Purpose**: Analyze user's communication patterns
- **Tech**: Background job that processes historical messages
- **Process**:
  1. Fetch user's sent messages from GHL (last 100-200)
  2. Extract patterns (tone, formality, length, structure)
  3. Store as style embeddings/examples in vector DB
  4. Update periodically (weekly) as new messages accumulate
- **Why Async**: Processing historical data is expensive

### 8. **Approval Service** (Sync/Async)
- **Purpose**: Human-in-the-loop for generated messages
- **Tech**: API endpoints + webhook notifications
- **Flow**:
  1. AI generates message, flags for approval
  2. Store in approval queue (PostgreSQL)
  3. Notify user (email/webhook)
  4. User approves/rejects/edits via API
  5. If approved, send via GHL Integration Service
- **Approval Triggers**: High-value deals, first message to contact, sensitive keywords detected

### 9. **Stalled Deal Detector** (Async - Scheduled)
- **Purpose**: Periodic scan for deals that need attention
- **Tech**: Cron job (every 6-12 hours)
- **Logic**:
  - Query GHL for deals in active pipelines
  - Check last contact date (configurable threshold, default 7 days)
  - Check deal value (only process deals above minimum threshold)
  - Enqueue `analyze_deal` jobs for candidates
- **Why Scheduled**: Don't need real-time detection; periodic is fine

## Data Flow: GHL → AI → Action

### Flow 1: Webhook-Driven (Real-time)
```
GHL Webhook (deal updated)
  ↓ [Sync - < 200ms]
Webhook Receiver
  ↓ [Async - enqueue]
Job Queue: analyze_deal
  ↓ [Async - 5-30s]
GHL Integration: Fetch deal + conversation history
  ↓ [Async]
Memory Service: Store conversation, retrieve KB/style context
  ↓ [Async - 10-60s]
AI Service: Analyze + generate message
  ↓ [Async]
Approval Service: Check if approval needed
  ↓ [If approved or auto-send]
GHL Integration: Send message (SMS/email)
  ↓ [Async]
Memory Service: Store sent message
```

### Flow 2: Scheduled Scan (Background)
```
Cron Job (every 6 hours)
  ↓ [Async]
Stalled Deal Detector: Query GHL for active deals
  ↓ [Async]
Filter: Last contact > 7 days, value > threshold
  ↓ [Async - enqueue per deal]
Job Queue: analyze_deal
  ↓ [Continue as Flow 1]
```

### Flow 3: Knowledge Base Upload
```
User uploads document via API
  ↓ [Sync - < 1s]
API stores file, returns 202 Accepted
  ↓ [Async - 30s-5min]
Knowledge Base Ingestion: Extract text, chunk, embed
  ↓ [Async]
Memory Service: Store embeddings in vector DB
```

## Synchronous vs Asynchronous

### Synchronous (Must be fast)
- **Webhook Receiver**: Return 200 to GHL immediately
- **API Endpoints**: User-facing endpoints (upload KB, get status)
- **Approval API**: User approves/rejects messages

### Asynchronous (Can take time)
- **All AI processing**: LLM calls are slow (10-60s)
- **GHL data fetching**: API calls can be slow, batch when possible
- **Vector DB operations**: Embedding generation and similarity search
- **Document processing**: PDF parsing, chunking, embedding
- **Style learning**: Processing hundreds of messages

## Memory & Knowledge Base Storage

### Vector Database (Semantic Search)
- **Conversations**: 
  - Embedding: Last 50 messages per deal (rolling window)
  - Metadata: deal_id, contact_id, timestamp, message_type
  - Purpose: Context retrieval for message generation
- **Knowledge Base**:
  - Embedding: Document chunks (500-1000 tokens)
  - Metadata: user_id, doc_type, source_file, chunk_index
  - Purpose: Retrieve relevant offers/scripts/FAQs
- **Style Examples**:
  - Embedding: User's sent messages (last 100-200)
  - Metadata: user_id, message_type, timestamp
  - Purpose: Match communication style

### PostgreSQL (Structured Data)
- **Users**: API keys, GHL credentials, configs
- **Deals**: deal_id, status, last_contact_date, value, pipeline
- **Approval Queue**: message_id, deal_id, generated_message, status, created_at
- **Jobs**: job_id, type, status, deal_id, created_at, completed_at
- **Knowledge Base Metadata**: file_id, user_id, filename, upload_date, status

## Background Jobs Architecture

### Job Queue Setup
- **Queue**: Redis-backed (BullMQ/Celery)
- **Workers**: 2-5 workers (scales with load)
- **Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Failed jobs after max retries

### Job Types & Priorities
1. **High Priority**: `analyze_deal` (user-facing, time-sensitive)
2. **Medium Priority**: `generate_message` (follow-up to analyze_deal)
3. **Low Priority**: `ingest_knowledge_base`, `learn_style` (can wait)

### Job Dependencies
- `analyze_deal` → `generate_message` (if deal is stalled)
- `generate_message` → `send_message` (if auto-approved)

## What Can Be Mocked for MVP

### Can Mock (Faster Development)
1. **Vector DB**: 
   - Use in-memory embeddings or simple file-based storage
   - Or use free tier Pinecone/Qdrant
   - Mock semantic search with keyword matching
2. **Style Learning**: 
   - Skip initially, use hardcoded style templates
   - Add later when you have real message data
3. **Approval Service**: 
   - Auto-approve all messages for MVP
   - Add approval UI later
4. **Scheduled Scans**: 
   - Trigger manually via API for testing
   - Add cron later
5. **Knowledge Base Ingestion**: 
   - Accept simple text files only
   - Skip PDF/DOCX parsing initially
6. **Multiple Message Types**: 
   - Start with SMS only
   - Add email later

### Cannot Mock (Core Functionality)
1. **GHL Integration**: Need real API calls to test
2. **LLM Calls**: Need real AI for message generation
3. **Job Queue**: Need async processing (can use local Redis)
4. **Webhook Receiver**: Need to handle real GHL webhooks

## Technology Stack Recommendations

### Backend (Choose One)
- **Node.js**: Express + BullMQ + TypeScript
- **Python**: FastAPI + Celery + Pydantic

### Vector DB
- **MVP**: Qdrant (self-hosted, free)
- **Production**: Pinecone (managed, easier) or Weaviate

### LLM
- **MVP**: OpenAI GPT-4 (best quality)
- **Alternative**: Anthropic Claude (good quality, better context)

### Database
- **PostgreSQL**: Standard relational DB for metadata

### Queue
- **Redis**: Required for job queue

### Infrastructure
- **MVP**: Single server (Node/Python + Redis + PostgreSQL + Qdrant)
- **Production**: Separate services, containerized (Docker)

## MVP Development Path

1. **Week 1**: Webhook receiver + GHL integration (read deals, send messages)
2. **Week 2**: Job queue + basic AI service (hardcoded prompts, no memory)
3. **Week 3**: Vector DB integration (store/retrieve conversations)
4. **Week 4**: Knowledge base ingestion (text files only)
5. **Week 5**: Stalled deal detection + scheduled scans
6. **Week 6**: Style learning + approval service

## Key Design Decisions

1. **Fire-and-forget webhooks**: Never block GHL, always async process
2. **Vector DB for memory**: Enables semantic search over conversations/KB
3. **PostgreSQL for metadata**: Fast queries for deal status, approvals
4. **Job queue mandatory**: AI is slow, must be async
5. **Human approval optional**: Start with auto-send, add approval later
6. **Style learning deferred**: Can launch without it, add for stickiness

