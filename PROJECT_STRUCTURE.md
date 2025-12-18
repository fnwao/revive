# Revive.ai - Project Structure

## Overview

Revive.ai is an AI-powered revenue recovery system for B2B service businesses using GoHighLevel. This document outlines the complete project structure and organization.

## Repository Structure

```
revive-ai/
├── backend/                 # Python FastAPI backend
├── nextjs-frontend/         # Next.js 14 frontend (ACTIVE)
├── frontend/                # Legacy frontend (DEPRECATED)
├── docs/                    # Project documentation
└── README.md                # Main project README
```

## Backend (`backend/`)

### Core Application

```
backend/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── approvals.py     # Approval queue endpoints
│   │   ├── dashboard.py    # Dashboard statistics
│   │   ├── deals.py        # Deal detection and management
│   │   └── webhooks.py     # GoHighLevel webhook receiver
│   ├── core/                # Core utilities
│   │   └── auth.py         # API key authentication
│   ├── db/                  # Database setup
│   │   ├── base.py         # SQLAlchemy base
│   │   └── session.py      # Database session management
│   ├── models/              # SQLAlchemy models
│   │   ├── approval_queue.py
│   │   ├── conversation.py
│   │   ├── deal.py
│   │   └── user.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── approval.py
│   │   ├── deal.py
│   │   ├── message.py
│   │   └── webhook.py
│   ├── services/            # Business logic
│   │   ├── ai.py           # OpenAI integration
│   │   ├── approval.py     # Approval processing
│   │   ├── deal_detection.py
│   │   ├── ghl.py          # GoHighLevel service
│   │   └── ghl_mock.py     # Mock GHL service
│   ├── workers/             # Background tasks
│   │   ├── celery_app.py   # Celery configuration
│   │   └── tasks.py        # Task definitions
│   ├── config.py            # Application configuration
│   └── main.py              # FastAPI application
├── alembic/                 # Database migrations
│   ├── versions/           # Migration files
│   └── env.py              # Alembic environment
├── docs/                    # Backend documentation
│   ├── APPROVAL_QUEUE.md
│   ├── AUTH_USAGE.md
│   ├── DEAL_DETECTION.md
│   ├── MESSAGE_GENERATION.md
│   ├── MOCK_GHL.md
│   └── TESTING.md
├── scripts/                 # Utility scripts
│   ├── add_test_data.py    # Add test data to database
│   ├── create_user.py      # User management
│   └── test_full_flow.py   # End-to-end testing
├── tests/                   # Unit tests (TODO)
├── docker-compose.yml       # Docker services (PostgreSQL, Redis, Qdrant)
├── requirements.txt         # Python dependencies
├── README.md                # Backend README
└── SETUP.md                 # Setup instructions
```

### Key Backend Features

- ✅ API key authentication
- ✅ Deal detection endpoint
- ✅ Message generation with OpenAI
- ✅ Approval queue management
- ✅ Mock GHL service for testing
- ✅ Dashboard statistics
- ✅ Database migrations (Alembic)
- ✅ Test data scripts

## Frontend (`nextjs-frontend/`)

### Application Structure

```
nextjs-frontend/
├── app/
│   ├── (app)/               # Protected routes (requires auth)
│   │   ├── dashboard/      # Main dashboard
│   │   ├── revivals/       # Revival management
│   │   ├── knowledge-base/ # Document management
│   │   ├── pricing/        # Subscription plans
│   │   ├── settings/       # Settings page
│   │   └── layout.tsx      # App layout with sidebar
│   ├── login/              # Login page
│   ├── signup/             # Signup flow
│   ├── onboarding/        # Tutorial
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── layout/
│   │   └── sidebar.tsx     # Navigation sidebar
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── switch.tsx
│   │   ├── toast.tsx
│   │   └── toaster.tsx
│   └── logo.tsx            # Revive.ai logo
├── hooks/
│   └── use-toast.ts        # Toast notifications
├── lib/
│   ├── api.ts              # Backend API client
│   ├── demo-data.ts        # Demo conversations
│   ├── knowledge-base.ts   # KB utilities
│   ├── mock-state.ts       # Mock state
│   ├── subscription.ts    # Subscription management
│   ├── toast.ts            # Toast utilities
│   ├── user.ts             # User state
│   └── utils.ts            # Utilities
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### Key Frontend Features

- ✅ Modern Next.js 14 App Router
- ✅ TypeScript for type safety
- ✅ Dark theme design system
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Mock data fallback
- ✅ LocalStorage persistence

## Documentation (`docs/`)

```
docs/
├── ARCHITECTURE.md          # System architecture
├── STACK.md                 # Technology stack
├── V1_SCOPE.md              # V1 feature scope
├── SPRINT_1.md              # Sprint 1 status
└── NEXT_STEPS.md            # Future roadmap
```

## Legacy Frontend (`frontend/`)

**Status:** DEPRECATED - This is the old vanilla JavaScript frontend. Use `nextjs-frontend/` instead.

## Key Files

### Configuration Files

- `backend/.env` - Backend environment variables
- `backend/docker-compose.yml` - Docker services
- `backend/requirements.txt` - Python dependencies
- `nextjs-frontend/package.json` - Node.js dependencies
- `nextjs-frontend/tailwind.config.ts` - Tailwind configuration

### Documentation Files

- `README.md` - Main project overview
- `backend/README.md` - Backend documentation
- `backend/SETUP.md` - Backend setup guide
- `nextjs-frontend/README.md` - Frontend documentation
- `FRONTEND_SETUP.md` - Frontend setup guide
- `PROJECT_STRUCTURE.md` - This file

## Development Workflow

### Backend Development

1. Activate virtual environment: `source backend/venv/bin/activate`
2. Start services: `cd backend && docker compose up -d`
3. Run migrations: `alembic upgrade head`
4. Start server: `uvicorn app.main:app --reload`

### Frontend Development

1. Install dependencies: `cd nextjs-frontend && npm install`
2. Start dev server: `npm run dev`
3. Open browser: `http://localhost:3000`

## Testing

### Backend Testing

```bash
cd backend
python scripts/test_full_flow.py
```

### Frontend Testing

The frontend includes mock data that works without a backend. Simply start the dev server and navigate through the app.

## Deployment

### Backend

- FastAPI application
- Requires PostgreSQL, Redis, and Qdrant
- Can be containerized with Docker

### Frontend

- Next.js application
- Can be deployed to Vercel, Netlify, or any Node.js hosting
- Requires environment variable: `NEXT_PUBLIC_API_URL`

## Next Steps

1. Complete authentication flow
2. Connect to real GoHighLevel API
3. Add vector database for knowledge base
4. Implement real-time updates
5. Add comprehensive testing

