# Deal Detection Endpoint

The deal detection endpoint finds deals that have been inactive for a specified period.

## Endpoint

```
POST /api/v1/deals/detect-stalled
```

**Authentication:** Required (Bearer token)

## Request

### Option 1: Check all deals in a pipeline

```json
{
  "pipeline_id": "pipeline-001",
  "stalled_threshold_days": 7
}
```

### Option 2: Check specific deals

```json
{
  "deal_ids": ["deal-001", "deal-002", "deal-003"],
  "stalled_threshold_days": 7
}
```

### Parameters

- `pipeline_id` (optional): Check all deals in this pipeline
- `deal_ids` (optional): List of specific deal IDs to check
- `stalled_threshold_days` (optional, default: 7): Days of inactivity to consider stalled (1-90)

**Note:** You must provide either `pipeline_id` OR `deal_ids`, not both.

## Response

```json
{
  "stalled_deals": [
    {
      "deal_id": "deal-001",
      "title": "Acme Corp - Enterprise Package",
      "status": "active",
      "value": 5000.00,
      "currency": "USD",
      "last_activity_date": "2024-01-01T00:00:00Z",
      "days_since_activity": 10,
      "contact_id": "contact-001",
      "pipeline_id": "pipeline-001"
    }
  ],
  "total_found": 1,
  "threshold_days": 7
}
```

## Example Usage

### Using cURL

```bash
# Set your API key
export API_KEY="your-api-key-here"

# Detect stalled deals in a pipeline
curl -X POST http://localhost:8000/api/v1/deals/detect-stalled \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": "pipeline-001",
    "stalled_threshold_days": 7
  }'

# Detect stalled deals for specific deals
curl -X POST http://localhost:8000/api/v1/deals/detect-stalled \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deal_ids": ["deal-001", "deal-003"],
    "stalled_threshold_days": 10
  }'
```

### Using Python

```python
import httpx

api_key = "your-api-key-here"
base_url = "http://localhost:8000"

# Detect stalled deals
response = httpx.post(
    f"{base_url}/api/v1/deals/detect-stalled",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "pipeline_id": "pipeline-001",
        "stalled_threshold_days": 7
    }
)

data = response.json()
print(f"Found {data['total_found']} stalled deals")

for deal in data["stalled_deals"]:
    print(f"- {deal['title']}: {deal['days_since_activity']} days inactive")
```

## How It Works

1. **Fetches deals** from GHL (or mock service)
   - If `pipeline_id` provided: fetches all deals in pipeline
   - If `deal_ids` provided: fetches specific deals

2. **Checks last activity date** for each deal
   - Compares `last_activity_date` to threshold (now - threshold_days)
   - Deals with no activity date are considered stalled

3. **Returns stalled deals** with metadata:
   - Deal ID, title, status, value
   - Days since last activity
   - Contact and pipeline IDs

## Mock Data Testing

With mock GHL service enabled, you can test with:

- **Pipeline ID:** `pipeline-001` (has 3 stalled deals: deal-001, deal-003, deal-005)
- **Pipeline ID:** `pipeline-002` (has 1 active deal: deal-004)
- **Deal IDs:** `deal-001`, `deal-002`, `deal-003`, `deal-004`, `deal-005`

Expected results with 7-day threshold:
- `deal-001`: Stalled (10 days)
- `deal-002`: Active (3 days)
- `deal-003`: Stalled (12 days)
- `deal-004`: Active (1 day)
- `deal-005`: Stalled (8 days)

## Error Responses

### Missing pipeline_id or deal_ids
```json
{
  "detail": "Either pipeline_id or deal_ids must be provided"
}
```

### Both provided
```json
{
  "detail": "Provide either pipeline_id OR deal_ids, not both"
}
```

### Invalid threshold
```json
{
  "detail": "stalled_threshold_days must be between 1 and 90"
}
```

## Next Steps

After detecting stalled deals, you can:
1. Generate reactivation messages for each stalled deal
2. Review and approve messages
3. Send messages to contacts

See the message generation endpoint documentation for details.

