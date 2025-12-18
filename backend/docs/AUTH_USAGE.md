# API Key Authentication Usage

## Creating Users

Use the admin script to create users and generate API keys:

```bash
cd backend
python scripts/create_user.py create --email user@example.com
```

This will output:
- User ID
- **API Key** (save this - it's only shown once!)

## Listing Users

```bash
python scripts/create_user.py list
```

## Using API Keys

All protected endpoints require authentication via the `Authorization` header:

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/ghl \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deal.updated",
    "timestamp": "2024-01-01T00:00:00Z",
    "data": {"deal_id": "123"}
  }'
```

## Unprotected Endpoints

These endpoints don't require authentication:
- `GET /health` - Health check
- `GET /` - Root endpoint
- `GET /docs` - API documentation

## Protected Endpoints

All other endpoints require a valid API key:
- `POST /api/v1/webhooks/ghl` - Webhook receiver
- `POST /api/v1/deals/detect-stalled` - Deal detection (coming soon)
- `POST /api/v1/deals/{deal_id}/generate-message` - Message generation (coming soon)
- `GET /api/v1/approvals` - List approvals (coming soon)
- `POST /api/v1/approvals/{id}/approve` - Approve message (coming soon)

## Error Responses

### Missing Authorization Header
```json
{
  "detail": "Invalid authorization header. Expected: Bearer <api_key>"
}
```

### Invalid API Key
```json
{
  "detail": "Invalid API key"
}
```

## Testing Authentication

### Test with valid key:
```bash
# First create a user
python scripts/create_user.py create --email test@example.com

# Use the API key from output
export API_KEY="your-api-key-here"

# Test webhook endpoint
curl -X POST http://localhost:8000/api/v1/webhooks/ghl \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event":"test","timestamp":"2024-01-01T00:00:00Z","data":{}}'
```

### Test without key (should fail):
```bash
curl -X POST http://localhost:8000/api/v1/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{"event":"test","timestamp":"2024-01-01T00:00:00Z","data":{}}'
# Expected: 401 Unauthorized
```

