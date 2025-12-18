# Revive.ai Backend

Backend API for Revive.ai - AI-powered revenue recovery system for GoHighLevel.

## Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Queue**: Celery + Redis
- **Vector DB**: Qdrant (for future use)

## Setup

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- PostgreSQL, Redis (or use Docker Compose)

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

4. **Start services (Docker):**
```bash
docker-compose up -d
```

5. **Run database migrations:**
```bash
# Create initial migration (if not already created)
alembic revision --autogenerate -m "initial"

# Apply migrations
alembic upgrade head
```

6. **Start the API server:**
```bash
uvicorn app.main:app --reload
```

7. **Start Celery worker (in separate terminal):**
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

## Project Structure

```
backend/
├── app/
│   ├── api/              # API routes
│   │   └── webhooks.py   # GHL webhook endpoint
│   ├── models/           # SQLAlchemy models
│   │   ├── user.py
│   │   ├── deal.py
│   │   ├── conversation.py
│   │   └── approval_queue.py
│   ├── schemas/          # Pydantic schemas
│   │   └── webhook.py
│   ├── services/         # Business logic
│   │   └── ghl.py        # GHL API integration
│   ├── workers/          # Background tasks
│   │   ├── celery_app.py # Celery configuration
│   │   └── tasks.py      # Task definitions
│   ├── db/               # Database setup
│   │   ├── base.py
│   │   └── session.py
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── tests/                # Unit tests
├── alembic/              # Database migrations
├── requirements.txt
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Health Check
- `GET /health` - Health check

### Authentication
- All protected endpoints require: `Authorization: Bearer <api_key>`

### Deals
- `POST /api/v1/deals/detect-stalled` - Detect stalled deals
- `POST /api/v1/deals/{deal_id}/generate-message` - Generate revival message

### Approvals
- `GET /api/v1/approvals` - List approvals (with filtering)
- `POST /api/v1/approvals/{id}/approve` - Approve message
- `POST /api/v1/approvals/{id}/reject` - Reject message
- `POST /api/v1/approvals/{id}/send` - Send message

### Dashboard
- `GET /api/v1/dashboard/stats` - Dashboard statistics

### Webhooks
- `POST /api/v1/webhooks/ghl` - Receive GoHighLevel webhooks

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
ruff check app/
```

## Environment Variables

See `.env.example` for required environment variables.

## Completed Features

✅ **API Key Authentication** - Secure API key hashing and verification  
✅ **Database Migrations** - Alembic configured and working  
✅ **Deal Detection** - Detect stalled deals with configurable thresholds  
✅ **Message Generation** - AI-powered message generation with OpenAI  
✅ **Approval Queue** - Full approval workflow (approve, reject, send)  
✅ **Mock GHL Service** - Test without real GHL API  
✅ **Dashboard Statistics** - Revenue and revival metrics  
✅ **Test Scripts** - End-to-end testing utilities  

## Next Steps

1. Connect to real GoHighLevel API (OAuth flow)
2. Add vector database for knowledge base
3. Implement style learning from user messages
4. Add real-time webhook processing
5. Implement conversation syncing
6. Add comprehensive unit tests

