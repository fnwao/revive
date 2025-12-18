# Getting Started with Revive.ai

This guide will help you get Revive.ai up and running quickly.

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+** and pip
- **Docker Desktop** (for PostgreSQL, Redis, Qdrant)
- **OpenAI API Key** (for message generation)

## Quick Start (5 minutes)

### 1. Start Backend Services

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL, Redis, and Qdrant in Docker containers.

### 2. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example or create manually)
# Minimum required:
# DATABASE_URL=postgresql://revive_user:revive_password@localhost:5432/revive_ai
# REDIS_URL=redis://localhost:6379/0
# SECRET_KEY=your-secret-key
# API_KEY_SALT=your-salt
# OPENAI_API_KEY=your-openai-key
# USE_MOCK_GHL=true

# Run database migrations
alembic upgrade head

# Create a user and get API key
python scripts/create_user.py create --email your@email.com
# ⚠️ Save the API key that's displayed!

# Start the backend server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### 3. Set Up Frontend

```bash
cd nextjs-frontend

# Install dependencies
npm install

# Install toast component (if needed)
npm install @radix-ui/react-toast

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 4. Connect Frontend to Backend

1. Open `http://localhost:3000` in your browser
2. Sign up or log in
3. Go to **Settings** → **API Configuration**
4. Enter your API key (from step 2)
5. Enter API URL: `http://localhost:8000`
6. Click **Save**

## Verify Everything Works

### Test Backend

```bash
cd backend
python scripts/test_full_flow.py
```

This will test:
- ✅ Health check
- ✅ User creation
- ✅ Deal detection
- ✅ Message generation
- ✅ Approval workflow

### Test Frontend

1. Go to **Dashboard** - should show demo stats
2. Go to **Revivals** - should show 12 demo deals
3. Go to **Knowledge Base** - try uploading a document
4. Go to **Settings** - verify your API key is saved

## What You Can Do Now

### Without Backend (Demo Mode)

The frontend works with mock data when no API key is configured:
- View dashboard with demo stats
- Browse stalled deals
- Upload documents to knowledge base
- Configure settings
- View pricing plans

### With Backend Connected

- Detect stalled deals from database
- Generate AI-powered revival messages
- Approve and send messages
- View real dashboard statistics
- Manage approval queue

## Common Issues

### Backend won't start

**Database connection error:**
```bash
# Make sure Docker is running
docker compose ps

# Restart services
docker compose restart
```

**Port already in use:**
```bash
# Use a different port
uvicorn app.main:app --reload --port 8001
```

### Frontend won't start

**Dependencies not installed:**
```bash
npm install
```

**TypeScript errors:**
```bash
# Check for errors
npm run build
```

### API key not working

1. Verify API key is correct (no extra spaces)
2. Check backend is running: `curl http://localhost:8000/health`
3. Verify API URL in Settings matches backend URL
4. Check browser console for errors

## Next Steps

1. **Add Test Data:**
   ```bash
   cd backend
   python scripts/add_test_data.py --email your@email.com
   ```

2. **Explore the Dashboard:**
   - View revenue metrics
   - Check pending approvals
   - Review active revivals

3. **Try Message Generation:**
   - Go to Revivals
   - Select a deal
   - Click "Generate Message"
   - Review and approve

4. **Upload Knowledge Base:**
   - Go to Knowledge Base
   - Upload sales scripts, FAQs, or product docs
   - AI will use these when generating messages

## Need Help?

- **Backend Issues:** See `backend/SETUP.md`
- **Frontend Issues:** See `FRONTEND_SETUP.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Project Structure:** See `PROJECT_STRUCTURE.md`

## Development Tips

- Backend auto-reloads on file changes (with `--reload`)
- Frontend hot-reloads automatically
- Use browser DevTools to debug
- Check backend logs for API errors
- Mock GHL service is enabled by default (`USE_MOCK_GHL=true`)

