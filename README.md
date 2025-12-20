# Revive.ai

> AI-powered revenue recovery system for B2B service businesses using GoHighLevel

[![Status](https://img.shields.io/badge/status-active%20development-green)](https://github.com)
[![Backend](https://img.shields.io/badge/backend-FastAPI-blue)](./backend)
[![Frontend](https://img.shields.io/badge/frontend-Next.js%2014-black)](./nextjs-frontend)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

Revive.ai automatically detects stalled deals in your GoHighLevel pipeline and re-engages them with context-aware, AI-generated messages that feel human. It learns your communication style, understands your product, and recovers revenue that would otherwise be lost.

## 🎯 What It Does

Revive.ai integrates with GoHighLevel to:

- **📊 Detect Stalled Deals** - Automatically identifies opportunities that need attention
- **🤖 Generate Context-Aware Messages** - Uses AI to craft personalized revival messages based on:
  - Prior conversations (SMS, email, calls)
  - Your knowledge base (sales scripts, FAQs, product docs)
  - Your communication style and tone
- **✅ Human Approval** - Review and approve messages before sending
- **💾 Learn & Remember** - Builds knowledge over time about your business and customers
- **🔄 Background Operation** - Works quietly in the background, low-touch automation

The system should feel like a long-tenured sales operator who understands how your business sells.

## 🚀 Quick Start

Get Revive.ai running in **5 minutes**:

```bash
# 1. Start backend services (PostgreSQL, Redis)
cd backend
docker compose up -d

# 2. Set up backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/create_user.py create --email your@email.com
uvicorn app.main:app --reload

# 3. Set up frontend (in new terminal)
cd nextjs-frontend
npm install
npm run dev

# 4. Connect them
# Open http://localhost:3000 → Settings → API Configuration
# Enter your API key and backend URL (http://localhost:8000)
```

**📖 For detailed setup instructions, see [GETTING_STARTED.md](GETTING_STARTED.md)**

## ✨ Features

### ✅ Completed

**Backend:**
- ✅ FastAPI backend with PostgreSQL, Redis, Celery
- ✅ API key authentication
- ✅ Deal detection with configurable thresholds
- ✅ AI message generation (OpenAI GPT-4)
- ✅ Approval queue system (approve, reject, send)
- ✅ Dashboard statistics
- ✅ Mock GHL service for testing
- ✅ Database migrations (Alembic)
- ✅ Test data management scripts

**Frontend:**
- ✅ Next.js 14 with TypeScript
- ✅ Modern dark theme UI (ChatGPT/Notion-inspired)
- ✅ Dashboard with revenue metrics
- ✅ Revival management interface
- ✅ Knowledge base document management
- ✅ Settings and configuration
- ✅ Subscription management
- ✅ Toast notification system
- ✅ Responsive design

### 🚧 In Progress

- 🔄 Real GoHighLevel API integration (OAuth flow)
- 🔄 Vector database for knowledge base embeddings
- 🔄 Style learning from user messages
- 🔄 Real-time webhook processing

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  GoHighLevel│─────▶│  Revive.ai   │─────▶│   OpenAI    │
│     (GHL)   │      │   Backend    │      │     API     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  PostgreSQL   │
                    │  + Redis      │
                    │  + Qdrant     │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Next.js      │
                    │  Frontend     │
                    └──────────────┘
```

**Core Components:**
- **Backend API** (FastAPI) - Handles business logic, AI processing, data storage
- **Background Workers** (Celery) - Async processing for deal detection and message generation
- **Vector Database** (Qdrant) - Stores knowledge base embeddings and conversation context
- **Frontend** (Next.js) - Modern React UI for managing revivals and approvals

## 📁 Project Structure

```
revive-ai/
├── backend/              # Python FastAPI backend
│   ├── app/              # Application code
│   │   ├── api/          # API routes
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   └── workers/      # Celery tasks
│   ├── alembic/          # Database migrations
│   └── scripts/          # Utility scripts
├── nextjs-frontend/       # Next.js frontend (ACTIVE)
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   └── lib/              # Utilities
├── docs/                  # Documentation
└── README.md             # This file
```

**📖 See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete details**

## 🛠️ Technology Stack

**Backend:**
- **Python 3.11+** - Core language
- **FastAPI** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Task queue and caching
- **Celery** - Background job processing
- **Alembic** - Database migrations
- **OpenAI API** - LLM for message generation
- **Qdrant** - Vector database (planned)

**Frontend:**
- **Next.js 14** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Lucide React** - Icons

**Infrastructure:**
- **Docker Compose** - Local development environment
- **PostgreSQL** - Database container
- **Redis** - Cache/queue container
- **Qdrant** - Vector DB container (planned)

## 📚 Documentation

### Getting Started
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Complete setup guide (5 minutes)
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Project organization

### Setup Guides
- **[backend/README.md](backend/README.md)** - Backend setup and API docs
- **[FRONTEND_SETUP.md](FRONTEND_SETUP.md)** - Frontend setup guide

### Architecture
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and data flow
- **[docs/STACK.md](docs/STACK.md)** - Technology decisions

### API Documentation
- **Swagger UI**: `http://localhost:8000/docs` (when backend is running)
- **ReDoc**: `http://localhost:8000/redoc`

**📖 See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for complete documentation list**

## 🎯 Core Principles

1. **Opinionated Defaults** - Smart defaults over endless configuration
2. **Action Over Dashboards** - Focus on revenue recovery, not analytics
3. **AI Decides, Humans Override** - Automated with human oversight
4. **Background Operation** - Low-touch, set it and forget it
5. **Accumulated Memory** - Gets smarter over time

## 🔐 Authentication

Revive.ai uses API key authentication:

1. **Create a user:**
   ```bash
   cd backend
   python scripts/create_user.py create --email your@email.com
   ```

2. **Use the API key:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        http://localhost:8000/api/v1/dashboard/stats
   ```

3. **Configure in frontend:**
   - Go to Settings → API Configuration
   - Enter your API key and backend URL
   - Click Save

## 🧪 Testing

### Backend Tests
```bash
cd backend
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
cd backend
python scripts/add_test_data.py --email your@email.com
```

### Frontend Testing
The frontend includes mock data that works without a backend. Simply start the dev server and navigate through the app.

## 🐛 Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check Docker is running
docker compose ps

# Restart services
docker compose restart
```

**Port already in use:**
```bash
uvicorn app.main:app --reload --port 8001
```

**Migration errors:**
```bash
cd backend
alembic upgrade head
```

### Frontend Issues

**Dependencies not installed:**
```bash
cd nextjs-frontend
npm install
npm install @radix-ui/react-toast  # If needed
```

**TypeScript errors:**
```bash
npm run build
```

**404 errors for chunks:**
```bash
rm -rf .next
npm run dev
```

### API Connection Issues

1. Verify API key is correct (no extra spaces)
2. Check backend is running: `curl http://localhost:8000/health`
3. Verify API URL in Settings matches backend URL
4. Check browser console for errors

## 🚦 Development Status

### Current Sprint
- ✅ Backend MVP complete
- ✅ Frontend MVP complete
- ✅ Integration working
- 🔄 Real GHL API integration (next)

### Roadmap
- [ ] GoHighLevel OAuth integration
- [ ] Vector database for knowledge base
- [ ] Style learning from user messages
- [ ] Real-time webhook processing
- [ ] Conversation syncing
- [ ] Comprehensive unit tests

## 🤝 Contributing

1. Follow existing code style
2. Update documentation for new features
3. Add tests for new functionality
4. Ensure all linter checks pass

## 📄 License

Proprietary - All rights reserved

## 💬 Support

For issues or questions:
1. Check the relevant documentation file
2. Review troubleshooting sections
3. Check browser console / backend logs
4. Verify environment variables are set

---

**Built with ❤️ for B2B service businesses**
