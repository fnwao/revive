# Backend Setup Guide

## Prerequisites

- Python 3.11+
- pip (Python package manager)

## Setup Steps

### 1. Create Virtual Environment (Recommended)

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database
DATABASE_URL=postgresql://revive_user:revive_password@localhost:5432/revive_ai

# Redis
REDIS_URL=redis://localhost:6379/0

# API
SECRET_KEY=your-secret-key-here-change-in-production
API_KEY_SALT=your-api-key-salt-here

# GoHighLevel (can be dummy values for now)
GHL_CLIENT_ID=test
GHL_CLIENT_SECRET=test
GHL_REDIRECT_URI=http://localhost:8000/api/v1/auth/ghl/callback

# OpenAI (REQUIRED for message generation)
OPENAI_API_KEY=your-openai-api-key-here

# App
ENVIRONMENT=development
LOG_LEVEL=INFO
USE_MOCK_GHL=true
```

### 4. Set Up Database

**Option A: Using Docker Compose (Recommended)**

```bash
# Start PostgreSQL, Redis, and Qdrant
docker-compose up -d

# Wait for services to be ready (10-20 seconds)
docker-compose ps
```

**Option B: Using Local PostgreSQL**

Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE revive_ai;
```

### 5. Run Database Migrations

```bash
# Create initial migration (if not already created)
alembic revision --autogenerate -m "initial"

# Apply migrations
alembic upgrade head
```

### 6. Create a User

```bash
python scripts/create_user.py create --email your@email.com
```

**Save the API key that's output - you'll need it for the frontend!**

### 7. Start the Server

```bash
uvicorn app.main:app --reload
```

The server will start at `http://localhost:8000`

## Troubleshooting

### ModuleNotFoundError

If you see `ModuleNotFoundError`, make sure:
1. Virtual environment is activated
2. Dependencies are installed: `pip install -r requirements.txt`

### Database Connection Error

If you see database connection errors:
1. Make sure PostgreSQL is running
2. Check `DATABASE_URL` in `.env` file
3. Run migrations: `alembic upgrade head`

### OpenAI API Error

If message generation fails:
1. Set `OPENAI_API_KEY` in `.env` file
2. Make sure you have credits in your OpenAI account
3. Check API key is valid

### Port Already in Use

If port 8000 is already in use:
```bash
uvicorn app.main:app --reload --port 8001
```
Then update frontend API URL to `http://localhost:8001`

## Quick Start Checklist

- [ ] Virtual environment created and activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with all variables
- [ ] Database running (Docker Compose or local)
- [ ] Migrations run (`alembic upgrade head`)
- [ ] User created (`python scripts/create_user.py create --email your@email.com`)
- [ ] Server started (`uvicorn app.main:app --reload`)
- [ ] Frontend accessible at `http://localhost:8000`

## Next Steps

1. Open `http://localhost:8000` in your browser
2. Enter your API key in the setup section
3. Start using the interface!

