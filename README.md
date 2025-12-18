# Revive.ai

Revive.ai is an AI-powered revenue recovery system for B2B service businesses using GoHighLevel (GHL).

## Product Summary

Revive.ai integrates with GoHighLevel to:
- Read all prior communications (SMS, email, calls, transcripts)
- Ingest a client-provided knowledge base (sales scripts, offers, FAQs, docs)
- Learn the user's communication style, product, and objections
- Detect stalled or neglected opportunities in the pipeline
- Automatically re-engage deals in a human, context-aware way
- Recover revenue that would otherwise be lost

The system should feel like a long-tenured sales operator who understands how the business sells.

## Core Principles

- Opinionated defaults over endless configuration
- Action over dashboards
- AI decides, humans can override
- Background operation (low touch)
- Stickiness via accumulated memory and learning

## Initial Scope (V1)

- CRM: GoHighLevel only
- Features:
  - Stalled deal detection
  - Context-aware reactivation messages
  - Knowledge base ingestion
  - Style & tone learning
  - Human approval mode
- Non-goals:
  - Multi-CRM support
  - Cold outbound
  - Analytics dashboards
  - Enterprise sales workflows

## Architecture Assumptions

- Backend API (Python FastAPI)
- Background workers for AI processing (Celery + Redis)
- Webhooks from GHL
- Vector database for memory (conversations, KB, style) - Qdrant
- LLM for reasoning & message generation (OpenAI GPT-4)

## Success Criteria

- Users set it up once and forget about it
- Revenue is recovered quietly
- Turning it off feels painful

## Project Status

### ✅ Completed Features

**Backend:**
- FastAPI backend with PostgreSQL, Redis, Celery
- API key authentication
- Database migrations (Alembic)
- Deal detection endpoint
- AI message generation (OpenAI GPT-4)
- Approval queue system
- Dashboard statistics
- Mock GHL service for testing
- Test data management scripts

**Frontend:**
- Next.js 14 with TypeScript
- Modern dark theme UI
- Dashboard with revenue metrics
- Revival management interface
- Knowledge base document management
- Settings and configuration
- Subscription management
- Toast notification system
- Responsive design

### 🚧 In Progress

- Real GoHighLevel API integration (OAuth flow)
- Vector database for knowledge base embeddings
- Style learning from user messages
- Real-time webhook processing

### 📋 Documentation

- **Getting Started**: [`GETTING_STARTED.md`](GETTING_STARTED.md) - Quick setup guide
- **Project Structure**: [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) - Complete project organization
- **Backend Setup**: [`backend/SETUP.md`](backend/SETUP.md) - Backend installation
- **Frontend Setup**: [`FRONTEND_SETUP.md`](FRONTEND_SETUP.md) - Frontend installation
- **Architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System design
- **API Documentation**: `http://localhost:8000/docs` - Interactive Swagger UI

## Quick Start

### 1. Backend Setup

```bash
cd backend
docker compose up -d
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/create_user.py create --email your@email.com
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd nextjs-frontend
npm install
npm install @radix-ui/react-toast  # If needed
npm run dev
```

### 3. Connect Frontend to Backend

1. Open `http://localhost:3000`
2. Go to **Settings** → **API Configuration**
3. Enter your API key and backend URL (`http://localhost:8000`)
4. Click **Save**

See [`GETTING_STARTED.md`](GETTING_STARTED.md) for detailed instructions.

## Technology Stack

**Backend:**
- Python 3.11+
- FastAPI
- PostgreSQL
- Redis
- Celery
- Alembic (migrations)
- OpenAI API

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React

**Infrastructure:**
- Docker Compose (local development)
- PostgreSQL, Redis, Qdrant containers

## Project Structure

```
revive-ai/
├── backend/          # Python FastAPI backend
├── nextjs-frontend/  # Next.js frontend (ACTIVE)
├── frontend/         # Legacy frontend (DEPRECATED)
├── docs/             # Project documentation
└── README.md         # This file
```

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for complete structure.

## Development

### Running Tests

**Backend:**
```bash
cd backend
python scripts/test_full_flow.py
```

**Frontend:**
The frontend includes mock data that works without a backend. Simply start the dev server and navigate through the app.

### Adding Test Data

```bash
cd backend
python scripts/add_test_data.py --email your@email.com
```

## Contributing

1. Follow the existing code style
2. Update documentation for new features
3. Add tests for new functionality
4. Ensure all linter checks pass

## License

Proprietary - All rights reserved
