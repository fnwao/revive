# Run Revive.ai Locally - Quick Start

This guide will help you run both the backend and frontend locally so they work together.

## Prerequisites

- **Docker Desktop** - For PostgreSQL, Redis, and Qdrant
- **Python 3.11+** - For backend
- **Node.js 18+** - For frontend

## Step 1: Start Backend Services (Docker)

```bash
cd backend
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Qdrant (port 6333)

Wait 10-20 seconds for services to be ready.

## Step 2: Set Up Backend

```bash
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Check if .env exists, create if needed
# Make sure these are set:
# DATABASE_URL=postgresql://revive_user:revive_password@localhost:5432/revive_ai
# REDIS_URL=redis://localhost:6379/0
# OPENAI_API_KEY=your-openai-key-here
# USE_MOCK_GHL=true

# Run database migrations
alembic upgrade head

# Create a user and get API key
python scripts/create_user.py create --email your@email.com
# ⚠️ SAVE THE API KEY THAT'S DISPLAYED!

# Start the backend server
uvicorn app.main:app --reload
```

Backend will run at: `http://localhost:8000`

## Step 3: Set Up Frontend

Open a **new terminal window**:

```bash
cd nextjs-frontend

# Install dependencies (if not already done)
npm install

# Install toast component (if needed)
npm install @radix-ui/react-toast

# Start the frontend dev server
npm run dev
```

Frontend will run at: `http://localhost:3000`

## Step 4: Connect Frontend to Backend

1. Open `http://localhost:3000` in your browser
2. Sign up or log in
3. Go to **Settings** → **API Configuration**
4. Enter your API key (from Step 2)
5. Enter API URL: `http://localhost:8000`
6. Click **Save**

## Step 5: Add Test Data (Optional)

In a new terminal:

```bash
cd backend
source venv/bin/activate
python scripts/add_test_data.py --email your@email.com
```

This adds:
- 12 test deals
- 15 approvals (various statuses)
- 32 conversation messages

## Testing the Full Flow

1. **Dashboard**: View stats and pending approvals
2. **Revivals**: 
   - Click "New Revival" or go to Revivals
   - Select a deal
   - Click to generate message
   - Approve and send
3. **Knowledge Base**: Upload documents
4. **Settings**: Update your name, API key, etc.

## Troubleshooting

### Backend won't start
- Check Docker is running: `docker compose ps`
- Check PostgreSQL is up: `docker compose logs postgres`
- Verify `.env` file exists with correct values

### Frontend won't start
- Check Node.js version: `node --version` (should be 18+)
- Clear cache: `rm -rf .next node_modules && npm install`
- Check for errors in terminal

### Can't connect frontend to backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check API URL in Settings matches backend URL
- Verify API key is correct
- Check browser console for errors (F12)

### No data showing
- Run `add_test_data.py` script
- Check API key is saved in Settings
- Verify backend is running and accessible

## Quick Commands Reference

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd nextjs-frontend
npm run dev
```

**Docker Services:**
```bash
cd backend
docker compose up -d    # Start
docker compose down     # Stop
docker compose ps       # Status
docker compose logs     # View logs
```

## Default Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Qdrant**: localhost:6333

## Next Steps

Once everything is running:
1. Test the full revival workflow
2. Upload documents to knowledge base
3. Generate and send messages
4. Check dashboard statistics

Everything should work end-to-end! 🚀

