# Quick Start - Run Locally

## ✅ Docker Services Status
Your Docker services are **already running**:
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)  
- ✅ Qdrant (port 6333)

## Step 1: Start Backend

Open a terminal and run:

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai/backend"
source venv/bin/activate
uvicorn app.main:app --reload
```

**Backend will run at:** http://localhost:8000

**First time setup (if needed):**
```bash
# Run migrations
alembic upgrade head

# Create a user and get API key
python scripts/create_user.py create --email your@email.com
# ⚠️ SAVE THE API KEY!
```

## Step 2: Start Frontend

Open a **NEW terminal** and run:

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai/nextjs-frontend"
npm run dev
```

**Frontend will run at:** http://localhost:3000

## Step 3: Connect Them

1. Open http://localhost:3000 in your browser
2. Sign up or log in
3. Go to **Settings** → **API Configuration**
4. Enter:
   - **API Key:** (from Step 1)
   - **API URL:** `http://localhost:8000`
5. Click **Save**

## Step 4: Add Test Data (Optional)

In a new terminal:

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai/backend"
source venv/bin/activate
python scripts/add_test_data.py --email your@email.com
```

## You're Ready! 🎉

Now you can:
- ✅ View dashboard with stats
- ✅ See stalled deals in Revivals
- ✅ Generate AI messages
- ✅ Approve and send messages
- ✅ Upload documents to Knowledge Base
- ✅ Update settings

## Troubleshooting

**Backend not starting?**
- Check Docker: `docker compose ps` (in backend directory)
- Check .env file exists
- Run migrations: `alembic upgrade head`

**Frontend not starting?**
- Check Node.js: `node --version` (should be 18+)
- Install dependencies: `npm install`
- Install toast: `npm install @radix-ui/react-toast`

**Can't connect?**
- Verify backend: `curl http://localhost:8000/health`
- Check API URL in Settings matches `http://localhost:8000`
- Verify API key is correct

## Default URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

