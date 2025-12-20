#!/bin/bash

# Quick start script for Revive.ai
# This script helps you start both backend and frontend

echo "🚀 Starting Revive.ai..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start Docker services
echo "📦 Starting Docker services (PostgreSQL, Redis, Qdrant)..."
cd "$(dirname "$0")/backend"
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check services
echo "✅ Checking services..."
docker compose ps

echo ""
echo "✅ Docker services started!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start Backend (in a new terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "2. Start Frontend (in another new terminal):"
echo "   cd nextjs-frontend"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📖 See RUN_LOCALLY.md for detailed instructions"

