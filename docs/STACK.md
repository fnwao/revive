# Revive.ai - V1 Technology Stack

## Stack Decision: Speed to MVP

This stack prioritizes **fastest path to working MVP** over long-term scalability concerns.

---

## Backend: Python + FastAPI

**Why:**
- **Fast development**: Python is concise, FastAPI has excellent async support
- **AI ecosystem**: Best libraries for LLM integration (OpenAI, Anthropic SDKs)
- **Type safety**: Pydantic models give runtime validation + type hints
- **Auto docs**: FastAPI generates OpenAPI/Swagger docs automatically
- **Async native**: Perfect for webhook → queue → async processing pattern

**Alternatives considered:**
- Node.js + Express: Good but Python has better AI tooling
- Django: Too heavy for API-only service

**Key packages:**
```python
fastapi
uvicorn[standard]  # ASGI server
pydantic
httpx  # Async HTTP client for GHL API
python-dotenv
```

---

## Database: PostgreSQL

**Why:**
- **Standard**: Everyone knows it, tons of docs
- **Reliable**: Battle-tested, won't break
- **JSON support**: Can store flexible configs in JSONB columns
- **Free hosting**: Railway, Supabase, Neon all offer free tiers

**For MVP:**
- Start with managed PostgreSQL (Railway/Supabase)
- No need to manage your own DB
- Easy migrations with Alembic

**Key packages:**
```python
sqlalchemy  # ORM
alembic  # Migrations
psycopg2-binary  # PostgreSQL driver
asyncpg  # Async PostgreSQL driver (optional, for performance)
```

**Schema highlights:**
- `users` table: API keys, GHL credentials
- `deals` table: deal_id, status, last_contact_date
- `approval_queue` table: pending messages
- `jobs` table: job status tracking

---

## Vector Store: Qdrant

**Why:**
- **Self-hosted**: Free, no API costs during development
- **Simple setup**: Docker container, done
- **Python SDK**: Excellent client library
- **Good enough**: Handles MVP scale easily (millions of vectors)
- **Local dev**: Run in Docker, deploy to same server

**Alternatives considered:**
- Pinecone: Managed but costs $70/month minimum
- ChromaDB: Simpler but less production-ready
- Weaviate: More complex setup

**For MVP:**
- Run Qdrant in Docker locally
- Deploy Qdrant container alongside app (same server)
- Upgrade to managed later if needed

**Key packages:**
```python
qdrant-client
sentence-transformers  # For generating embeddings (or use OpenAI embeddings)
```

**Collections:**
- `conversations_{user_id}`: Per-user conversation embeddings
- `knowledge_base_{user_id}`: Per-user KB document chunks
- `style_{user_id}`: Per-user style examples

---

## Queue/Background Jobs: Celery + Redis

**Why:**
- **Standard**: Most common Python job queue, tons of examples
- **Reliable**: Retries, dead letter queues, monitoring
- **Redis**: Simple, fast, cheap (free tier on Railway)
- **Flower**: Built-in monitoring UI (optional but helpful)

**For MVP:**
- Single Redis instance (Railway free tier)
- 2-3 Celery workers (can run on same server)
- Start simple, scale later

**Alternatives considered:**
- RQ: Simpler but less features (no retries, harder monitoring)
- Dramatiq: Modern but smaller ecosystem

**Key packages:**
```python
celery[redis]
redis
flower  # Monitoring UI (optional)
```

**Job types:**
- `analyze_deal`: Check if deal is stalled
- `generate_message`: Create AI message
- `ingest_knowledge_base`: Process documents
- `learn_style`: Analyze communication patterns

---

## Auth: API Keys (Simple)

**Why:**
- **Fastest**: No OAuth, no JWT complexity
- **Sufficient**: B2B service, API keys are standard
- **Easy**: Store in DB, check on each request
- **Upgrade later**: Can add OAuth/JWT if needed

**Implementation:**
- User creates account → generates API key
- Store hashed key in `users` table
- Middleware checks `Authorization: Bearer <key>` header
- FastAPI dependency for protected routes

**For MVP:**
- No user registration UI needed (manual account creation)
- Admin creates users via script/API
- Users get API key, use it in requests

**Key packages:**
```python
passlib[bcrypt]  # Hash API keys
python-jose[cryptography]  # Optional, if you want JWT later
```

---

## Hosting: Railway

**Why:**
- **Fastest setup**: Connect GitHub, auto-deploys
- **Free tier**: $5 credit/month (enough for MVP)
- **Managed services**: PostgreSQL, Redis included
- **Simple**: No Docker/Kubernetes complexity needed
- **Scales**: Can grow with you

**Setup:**
1. Connect GitHub repo
2. Add PostgreSQL service (free tier)
3. Add Redis service (free tier)
4. Deploy app (detects Python, runs `uvicorn`)
5. Add Qdrant container (or use Railway's Docker support)

**Alternatives considered:**
- Render: Similar but slightly more complex
- Fly.io: More control but more setup
- Heroku: Expensive, not worth it
- AWS/GCP: Too complex for MVP

**Cost for MVP:**
- Railway: $0-5/month (free tier covers it)
- OpenAI API: Pay per use (~$0.01-0.10 per message)
- **Total: < $50/month for MVP**

---

## LLM: OpenAI GPT-4

**Why:**
- **Best quality**: Best message generation
- **Simple API**: Well-documented, reliable
- **Fast**: Good response times
- **Pay per use**: No upfront costs

**For MVP:**
- Use GPT-4 for message generation
- Use `text-embedding-3-small` for embeddings (cheap, good quality)
- Can switch to Claude later if needed

**Key packages:**
```python
openai
tiktoken  # Token counting (optional)
```

**Cost:**
- GPT-4: ~$0.03 per message generation
- Embeddings: ~$0.0001 per 1K tokens
- **MVP estimate: $10-50/month depending on volume**

---

## Development Tools

**Package Management:**
- `poetry` or `pip` + `requirements.txt`
- Poetry is cleaner but pip is simpler for MVP

**Environment:**
- `.env` file for local dev
- Railway environment variables for production

**Testing:**
- `pytest` for unit tests
- `httpx` TestClient for API tests
- Mock GHL API responses

**Code Quality:**
- `black` for formatting
- `ruff` for linting (faster than flake8)
- Optional: `mypy` for type checking

---

## Complete Package List

```txt
# Core
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0

# Database
sqlalchemy==2.0.23
alembic==1.12.1
asyncpg==0.29.0  # Or psycopg2-binary for sync

# Queue
celery[redis]==5.3.4
redis==5.0.1
flower==2.0.1  # Optional monitoring

# Vector DB
qdrant-client==1.7.0
sentence-transformers==2.2.2  # Or use OpenAI embeddings

# LLM
openai==1.3.5
tiktoken==0.5.1  # Optional

# HTTP Client
httpx==0.25.1

# Auth
passlib[bcrypt]==1.7.4

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1

# Dev Tools
black==23.11.0
ruff==0.1.6
```

---

## Project Structure

```
revive-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── api/                 # API routes
│   │   │   ├── webhooks.py      # GHL webhook receiver
│   │   │   ├── deals.py         # Deal endpoints
│   │   │   └── knowledge_base.py
│   │   ├── services/            # Business logic
│   │   │   ├── ghl.py           # GHL integration
│   │   │   ├── ai.py            # LLM calls
│   │   │   ├── memory.py        # Vector DB operations
│   │   │   └── approval.py
│   │   ├── workers/             # Celery tasks
│   │   │   ├── analyze_deal.py
│   │   │   ├── generate_message.py
│   │   │   └── ingest_kb.py
│   │   └── db/                  # Database setup
│   │       ├── session.py
│   │       └── base.py
│   ├── alembic/                 # Migrations
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── docs/
├── README.md
└── docker-compose.yml           # Local dev (PostgreSQL, Redis, Qdrant)
```

---

## Local Development Setup

**1. Install dependencies:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

**2. Start services (Docker):**
```bash
docker-compose up -d  # PostgreSQL, Redis, Qdrant
```

**3. Run migrations:**
```bash
alembic upgrade head
```

**4. Start FastAPI:**
```bash
uvicorn app.main:app --reload
```

**5. Start Celery worker:**
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

**6. (Optional) Start Flower:**
```bash
celery -A app.workers.celery_app flower
```

---

## Deployment Checklist

1. **Railway setup:**
   - Create account, connect GitHub
   - Add PostgreSQL service
   - Add Redis service
   - Deploy app (auto-detects Python)

2. **Environment variables:**
   - `DATABASE_URL` (Railway provides)
   - `REDIS_URL` (Railway provides)
   - `QDRANT_URL` (if separate, or local)
   - `OPENAI_API_KEY`
   - `GHL_API_KEY` (per user, stored in DB)
   - `SECRET_KEY` (for API key hashing)

3. **Run migrations:**
   - Add migration step to Railway deploy command
   - Or run manually: `alembic upgrade head`

4. **Start workers:**
   - Railway can run multiple processes
   - Or use separate worker service

---

## Why This Stack Wins for MVP

1. **Python + FastAPI**: Write less code, ship faster
2. **PostgreSQL**: Standard, reliable, free hosting
3. **Qdrant**: Free, simple, good enough
4. **Celery + Redis**: Standard, well-documented
5. **API Keys**: Simplest auth, upgrade later
6. **Railway**: Deploy in minutes, not hours

**Time to working MVP: 2-3 weeks** (solo developer)

**Total monthly cost: < $50** (mostly OpenAI API usage)

---

## Future Upgrades (Post-MVP)

- **Auth**: Add OAuth/JWT if needed
- **Vector DB**: Move to Pinecone if scale requires it
- **Hosting**: Move to AWS/GCP if Railway limits hit
- **Monitoring**: Add Sentry, DataDog
- **Caching**: Add Redis caching layer
- **Rate limiting**: Add rate limiting middleware

But for V1, this stack gets you shipping fast.

