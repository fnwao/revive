#!/bin/bash
# Quick smoke test for Revive AI backend

echo "🧪 Running smoke tests..."
echo ""

# Check if server is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Server is not running. Start it with: uvicorn app.main:app --reload"
    exit 1
fi

echo "1. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "   ✅ Health check passed: $HEALTH"
else
    echo "   ❌ Health check failed: $HEALTH"
    exit 1
fi

echo ""
echo "2. Testing root endpoint..."
ROOT=$(curl -s http://localhost:8000/)
if echo "$ROOT" | grep -q "Revive AI"; then
    echo "   ✅ Root endpoint passed"
else
    echo "   ❌ Root endpoint failed: $ROOT"
    exit 1
fi

echo ""
echo "3. Testing webhook endpoint structure..."
WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deal.updated",
    "timestamp": "2024-01-01T00:00:00Z",
    "data": {
      "deal_id": "test-deal-123",
      "status": "active"
    }
  }')

if echo "$WEBHOOK_RESPONSE" | grep -q "ok\|error"; then
    echo "   ✅ Webhook endpoint responds: $WEBHOOK_RESPONSE"
else
    echo "   ❌ Webhook endpoint failed: $WEBHOOK_RESPONSE"
    exit 1
fi

echo ""
echo "4. Testing API docs availability..."
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "   ✅ API docs available at http://localhost:8000/docs"
else
    echo "   ❌ API docs not available"
    exit 1
fi

echo ""
echo "✅ All smoke tests passed!"

