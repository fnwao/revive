# Documentation Index

Complete guide to all Revive.ai documentation.

## Getting Started

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide (5 minutes to running app)
  - Backend setup
  - Frontend setup
  - Connecting frontend to backend
  - Verification steps

## Project Organization

- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Complete project structure
  - Repository organization
  - Backend structure
  - Frontend structure
  - Documentation locations
  - Development workflow

- **[README.md](README.md)** - Main project overview
  - Product summary
  - Core principles
  - Technology stack
  - Project status
  - Quick links

## Setup Guides

- **[backend/SETUP.md](backend/SETUP.md)** - Backend installation and setup
  - Prerequisites
  - Step-by-step setup
  - Database configuration
  - Troubleshooting

- **[FRONTEND_SETUP.md](FRONTEND_SETUP.md)** - Frontend installation and setup
  - Next.js setup
  - Dependencies
  - Development workflow
  - Troubleshooting

## Architecture & Design

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
  - Core services
  - Data flow
  - Synchronous vs asynchronous
  - Memory storage
  - Background jobs

- **[docs/STACK.md](docs/STACK.md)** - Technology stack decisions
  - Backend choices
  - Database choices
  - Frontend choices
  - Deployment options

- **[docs/V1_SCOPE.md](docs/V1_SCOPE.md)** - V1 feature scope
  - What must be built
  - What is fake/stubbed
  - What is explicitly cut

## Backend Documentation

- **[backend/README.md](backend/README.md)** - Backend overview
  - Tech stack
  - Project structure
  - API endpoints
  - Completed features

- **[backend/SPRINT_STATUS.md](backend/SPRINT_STATUS.md)** - Sprint 1 status
  - Completed tasks
  - Current status
  - Next priorities

- **[backend/docs/AUTH_USAGE.md](backend/docs/AUTH_USAGE.md)** - Authentication usage
  - API key generation
  - Using API keys
  - Protected endpoints

- **[backend/docs/DEAL_DETECTION.md](backend/docs/DEAL_DETECTION.md)** - Deal detection
  - How it works
  - API usage
  - Configuration

- **[backend/docs/MESSAGE_GENERATION.md](backend/docs/MESSAGE_GENERATION.md)** - Message generation
  - AI integration
  - Prompt engineering
  - Error handling

- **[backend/docs/APPROVAL_QUEUE.md](backend/docs/APPROVAL_QUEUE.md)** - Approval queue
  - Workflow
  - Endpoints
  - Status management

- **[backend/docs/MOCK_GHL.md](backend/docs/MOCK_GHL.md)** - Mock GHL service
  - Usage
  - Mock data
  - Testing

- **[backend/docs/TESTING.md](backend/docs/TESTING.md)** - Testing guide
  - Test scripts
  - Manual testing
  - Expected output

## Frontend Documentation

- **[nextjs-frontend/README.md](nextjs-frontend/README.md)** - Frontend overview
  - Tech stack
  - Project structure
  - Pages
  - Features

## Development

- **[docs/SPRINT_1.md](docs/SPRINT_1.md)** - Sprint 1 details
- **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** - Development roadmap

## Quick Reference

### Common Commands

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
python scripts/create_user.py create --email your@email.com
python scripts/add_test_data.py --email your@email.com
python scripts/test_full_flow.py
```

**Frontend:**
```bash
cd nextjs-frontend
npm install
npm run dev
```

**Database:**
```bash
cd backend
alembic upgrade head
docker compose up -d
```

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Support

For issues or questions:
1. Check the relevant documentation file
2. Review troubleshooting sections
3. Check browser console / backend logs
4. Verify environment variables are set

