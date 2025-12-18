# Testing Guide

## Quick Test

Run the end-to-end test script to validate the complete flow:

```bash
cd backend
python scripts/test_full_flow.py
```

This will test:
1. ✅ Health check
2. ✅ User creation
3. ✅ Stalled deal detection
4. ✅ Message generation
5. ✅ Approval listing
6. ✅ Message approval
7. ✅ Message sending

## Prerequisites

1. **Server running:**
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Database set up:**
   ```bash
   # Run migrations
   alembic upgrade head
   ```

3. **Environment variables:**
   - `OPENAI_API_KEY` - Required for message generation
   - `USE_MOCK_GHL=true` - Use mock service (default)
   - Other config in `.env` file

## Manual Testing

### 1. Create User

```bash
python scripts/create_user.py create --email test@example.com
# Save the API key that's output
```

### 2. Test Health Check

```bash
curl http://localhost:8000/health
```

### 3. Test Deal Detection

```bash
export API_KEY="your-api-key-here"

curl -X POST http://localhost:8000/api/v1/deals/detect-stalled \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": "pipeline-001",
    "stalled_threshold_days": 7
  }'
```

### 4. Test Message Generation

```bash
curl -X POST http://localhost:8000/api/v1/deals/deal-001/generate-message \
  -H "Authorization: Bearer $API_KEY"
```

### 5. Test Approval List

```bash
curl -X GET "http://localhost:8000/api/v1/approvals?status_filter=pending" \
  -H "Authorization: Bearer $API_KEY"
```

### 6. Test Approval

```bash
# Get approval ID from previous step
export APPROVAL_ID="approval-id-here"

curl -X POST http://localhost:8000/api/v1/approvals/$APPROVAL_ID/approve \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 7. Test Send

```bash
curl -X POST http://localhost:8000/api/v1/approvals/$APPROVAL_ID/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Full Flow Example

```bash
#!/bin/bash

# Set API key
export API_KEY="your-api-key-here"
BASE_URL="http://localhost:8000"

# 1. Detect stalled deals
echo "Detecting stalled deals..."
STALLED=$(curl -s -X POST "$BASE_URL/api/v1/deals/detect-stalled" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": "pipeline-001"}')

DEAL_ID=$(echo $STALLED | jq -r '.stalled_deals[0].deal_id')
echo "Found deal: $DEAL_ID"

# 2. Generate message
echo "Generating message..."
MESSAGE=$(curl -s -X POST "$BASE_URL/api/v1/deals/$DEAL_ID/generate-message" \
  -H "Authorization: Bearer $API_KEY")

APPROVAL_ID=$(echo $MESSAGE | jq -r '.approval_id')
echo "Generated message, approval ID: $APPROVAL_ID"

# 3. Approve
echo "Approving message..."
curl -s -X POST "$BASE_URL/api/v1/approvals/$APPROVAL_ID/approve" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Send
echo "Sending message..."
curl -s -X POST "$BASE_URL/api/v1/approvals/$APPROVAL_ID/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Done!"
```

## Testing with Mock Data

With `USE_MOCK_GHL=true` (default), you can test without real GHL API:

**Mock Deals:**
- `deal-001`: Stalled (10 days)
- `deal-002`: Active (3 days)
- `deal-003`: Stalled (12 days)
- `deal-004`: Active (1 day)
- `deal-005`: Stalled (8 days)

**Mock Pipelines:**
- `pipeline-001`: Has deals 001, 002, 003, 005
- `pipeline-002`: Has deal 004

**Mock Conversations:**
- Each deal has 5-15 SMS messages
- Spread over last 30 days
- Mix of inbound/outbound

## Testing with Real GHL API

1. Set `USE_MOCK_GHL=false` in `.env`
2. Connect GHL account (OAuth flow - TODO)
3. Use real deal IDs and pipelines
4. Messages will actually be sent

## Expected Output

### Successful Test Run

```
=== Revive AI - End-to-End Test ===

✅ Health check passed
✅ User created: test-abc123@example.com
✅ Found 3 stalled deal(s)
✅ Message generated (approval ID: 550e8400...)
✅ Found 1 approval(s) (1 pending)
✅ Message approved (status: approved)
✅ Message sent successfully (status: sent)

Results: 7/7 steps passed
🎉 All tests passed! Full flow is working.
```

## Troubleshooting

### Server Not Running
```
❌ Health check failed
```
**Fix:** Start server with `uvicorn app.main:app --reload`

### Database Not Set Up
```
❌ Error creating user: relation "users" does not exist
```
**Fix:** Run `alembic upgrade head`

### OpenAI API Key Missing
```
❌ Error generating message: Invalid API key
```
**Fix:** Set `OPENAI_API_KEY` in `.env`

### No Stalled Deals Found
```
⚠️  No stalled deals found
```
**Fix:** Check mock data or use real GHL with stalled deals

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Next Steps

After testing:
1. Review generated messages for quality
2. Test with different deal scenarios
3. Test error cases (invalid IDs, etc.)
4. Test with real GHL API when available

