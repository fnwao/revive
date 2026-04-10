# Revive.ai Backend

> FastAPI backend for AI-powered revenue recovery system

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://postgresql.org)

## Overview

The Revive.ai backend is a FastAPI application that handles:
- Deal detection and analysis
- AI-powered message generation
- Approval queue management
- GoHighLevel integration
- Background job processing

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker Desktop (for PostgreSQL, Redis)
- OpenAI API key

### Installation

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

   **Required variables:**
   ```env
   DATABASE_URL=postgresql://revive_user:revive_password@localhost:5432/revive_ai
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=your-secret-key-here
   API_KEY_SALT=your-api-key-salt-here
   OPENAI_API_KEY=your-openai-api-key-here
   USE_MOCK_GHL=true
   ```

4. **Start services (Docker):**
   ```bash
   docker compose up -d
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Create a user:**
   ```bash
   python scripts/create_user.py create --email your@email.com
   # ⚠️ Save the API key that's displayed!
   ```

7. **Start the API server:**
   ```bash
   uvicorn app.main:app --reload
   ```

8. **Start Celery worker (optional, for background jobs):**
   ```bash
   celery -A app.workers.celery_app worker --loglevel=info
   ```

The API will be available at `http://localhost:8000`

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── dashboard.py        # Dashboard statistics
│   │   ├── deals.py            # Deal detection and management
│   │   ├── approvals.py        # Approval queue
│   │   └── webhooks.py         # GHL webhook endpoint
│   ├── models/                 # SQLAlchemy database models
│   │   ├── user.py             # User model
│   │   ├── deal.py             # Deal/Opportunity model
│   │   ├── conversation.py     # Conversation messages
│   │   └── approval_queue.py   # Approval queue items
│   ├── schemas/                # Pydantic request/response schemas
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── ghl.py              # GoHighLevel API integration
│   │   ├── deal_detection.py   # Stalled deal detection
│   │   └── message_generation.py  # AI message generation
│   ├── workers/                # Background task processing
│   │   ├── celery_app.py       # Celery configuration
│   │   └── tasks.py            # Task definitions
│   ├── db/                     # Database setup
│   │   ├── base.py             # Base model
│   │   └── session.py          # Database session
│   ├── auth/                   # Authentication
│   │   └── dependencies.py    # API key verification
│   ├── config.py               # Configuration management
│   └── main.py                 # FastAPI application
├── alembic/                    # Database migrations
│   ├── versions/               # Migration files
│   └── env.py                  # Alembic environment
├── scripts/                    # Utility scripts
│   ├── create_user.py          # Create user and API key
│   ├── add_test_data.py        # Add test deals and conversations
│   └── test_full_flow.py       # End-to-end testing
├── tests/                      # Unit tests (planned)
├── requirements.txt            # Python dependencies
├── docker-compose.yml          # Docker services
├── .env.example                # Environment variable template
└── README.md                   # This file
```

## 🔌 API Endpoints

### Authentication

All protected endpoints require API key authentication:
```
Authorization: Bearer YOUR_API_KEY
```

### Health Check

- **GET** `/health` - Health check endpoint

### Dashboard

- **GET** `/api/v1/dashboard/stats` - Get dashboard statistics
  - Returns: Revenue metrics, revival counts, approval stats

### Deals

- **POST** `/api/v1/deals/detect-stalled` - Detect stalled deals
  - Body: `{ "pipeline_id": "string", "threshold_days": 7 }`
  - Returns: List of stalled deals

- **POST** `/api/v1/deals/{deal_id}/generate-message` - Generate revival message
  - Body: `{ "context": "optional context" }`
  - Returns: Generated message with confidence score

### Approvals

- **GET** `/api/v1/approvals` - List approval queue items
  - Query params: `status` (pending|approved|rejected|sent), `limit`, `offset`
  - Returns: List of approval items

- **POST** `/api/v1/approvals/{id}/approve` - Approve a message
  - Returns: Updated approval item

- **POST** `/api/v1/approvals/{id}/reject` - Reject a message
  - Body: `{ "reason": "optional reason" }`
  - Returns: Updated approval item

- **POST** `/api/v1/approvals/{id}/send` - Send an approved message
  - Returns: Sent message confirmation

### Webhooks

- **POST** `/api/v1/webhooks/ghl` - Receive GoHighLevel webhooks
  - Body: GHL webhook payload
  - Returns: Webhook processing status

## 🔐 Authentication

### Creating a User

```bash
python scripts/create_user.py create --email your@email.com
```

This will:
1. Create a user in the database
2. Generate an API key
3. Display the API key (save it!)

### Using API Keys

**In requests:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8000/api/v1/dashboard/stats
```

**In Python:**
```python
import requests

headers = {"Authorization": "Bearer YOUR_API_KEY"}
response = requests.get("http://localhost:8000/api/v1/dashboard/stats", headers=headers)
```

## 🧪 Testing

### Run Full Flow Test

```bash
python scripts/test_full_flow.py
```

This tests:
- ✅ Health check
- ✅ User creation
- ✅ Deal detection
- ✅ Message generation
- ✅ Approval workflow

### Add Test Data

```bash
python scripts/add_test_data.py --email your@email.com
```

This creates:
- Sample deals in various stages
- Conversation history
- Approval queue items

### Manual Testing

1. **Test deal detection:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/deals/detect-stalled \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"pipeline_id": "pipeline-001", "threshold_days": 7}'
   ```

2. **Test message generation:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/deals/1/generate-message \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json"
   ```

## 🛠️ Development

### Code Formatting

```bash
# Format code
black app/

# Lint code
ruff check app/
```

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Running Tests

```bash
# Run all tests (when implemented)
pytest

# Run with coverage
pytest --cov=app
```

## 📊 Features

### ✅ Completed

- ✅ **API Key Authentication** - Secure API key hashing and verification
- ✅ **Database Migrations** - Alembic configured and working
- ✅ **Deal Detection** - Detect stalled deals with configurable thresholds
- ✅ **Message Generation** - AI-powered message generation with OpenAI
- ✅ **Approval Queue** - Full approval workflow (approve, reject, send)
- ✅ **Mock GHL Service** - Test without real GHL API
- ✅ **Dashboard Statistics** - Revenue and revival metrics
- ✅ **Test Scripts** - End-to-end testing utilities

### 🚧 In Progress

- 🔄 Real GoHighLevel API integration (OAuth flow)
- 🔄 Vector database for knowledge base
- 🔄 Style learning from user messages
- 🔄 Real-time webhook processing

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - Secret key for hashing
- `API_KEY_SALT` - Salt for API key hashing
- `OPENAI_API_KEY` - OpenAI API key (required for message generation)
- `USE_MOCK_GHL` - Use mock GHL service (true/false)
- `GHL_CLIENT_ID` - GoHighLevel OAuth client ID
- `GHL_CLIENT_SECRET` - GoHighLevel OAuth client secret

### Database Configuration

The backend uses PostgreSQL with SQLAlchemy ORM. Connection is configured via `DATABASE_URL` environment variable.

### Redis Configuration

Redis is used for:
- Celery task queue
- Caching (planned)

Configure via `REDIS_URL` environment variable.

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# View logs
docker compose logs postgres

# Restart services
docker compose restart
```

### Migration Errors

```bash
# Check current migration status
alembic current

# Upgrade to latest
alembic upgrade head

# If stuck, check migration files
ls alembic/versions/
```

### API Key Not Working

1. Verify API key is correct (no extra spaces)
2. Check user exists in database
3. Verify API key hash matches
4. Check backend logs for errors

### OpenAI API Errors

1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has credits/quota
3. Review error messages in logs

## 📚 Additional Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[SPRINT_STATUS.md](SPRINT_STATUS.md)** - Current development status
- **[docs/AUTH_USAGE.md](docs/AUTH_USAGE.md)** - Authentication guide
- **[docs/DEAL_DETECTION.md](docs/DEAL_DETECTION.md)** - Deal detection details
- **[docs/MESSAGE_GENERATION.md](docs/MESSAGE_GENERATION.md)** - Message generation guide
- **[docs/APPROVAL_QUEUE.md](docs/APPROVAL_QUEUE.md)** - Approval queue workflow
- **[docs/MOCK_GHL.md](docs/MOCK_GHL.md)** - Mock GHL service usage

## 🚀 Next Steps

1. Connect to real GoHighLevel API (OAuth flow)
2. Add vector database for knowledge base
3. Implement style learning from user messages
4. Add real-time webhook processing
5. Implement conversation syncing
6. Add comprehensive unit tests

---

**For frontend setup, see [../nextjs-frontend/README.md](../nextjs-frontend/README.md)**