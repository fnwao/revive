# Approval Queue Endpoints

The approval queue allows you to review, approve, reject, and send generated reactivation messages.

## Endpoints

### List Approvals
```
GET /api/v1/approvals
```

### Approve Message
```
POST /api/v1/approvals/{approval_id}/approve
```

### Reject Message
```
POST /api/v1/approvals/{approval_id}/reject
```

### Send Message
```
POST /api/v1/approvals/{approval_id}/send
```

**Authentication:** All endpoints require Bearer token

---

## List Approvals

Get a list of all message approvals with optional filtering.

### Query Parameters

- `status_filter` (optional): Filter by status (`pending`, `approved`, `rejected`, `sent`)
- `deal_id` (optional): Filter by GHL deal ID
- `limit` (optional, default: 50): Maximum number of results (1-100)
- `offset` (optional, default: 0): Offset for pagination

### Response

```json
{
  "approvals": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "deal_id": "deal-001",
      "ghl_deal_id": "deal-001",
      "deal_title": "Acme Corp - Enterprise Package",
      "generated_message": "Hi! Wanted to follow up...",
      "edited_message": null,
      "status": "pending",
      "created_at": "2024-01-11T00:00:00Z",
      "approved_at": null,
      "sent_at": null
    }
  ],
  "total": 10,
  "pending": 5,
  "approved": 2,
  "rejected": 1,
  "sent": 2
}
```

### Example

```bash
# List all pending approvals
curl -X GET "http://localhost:8000/api/v1/approvals?status_filter=pending" \
  -H "Authorization: Bearer $API_KEY"

# List approvals for a specific deal
curl -X GET "http://localhost:8000/api/v1/approvals?deal_id=deal-001" \
  -H "Authorization: Bearer $API_KEY"
```

---

## Approve Message

Approve a generated message (marks as approved but doesn't send).

### Request

No body required.

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "message": "Message approved successfully",
  "sent": false
}
```

### Example

```bash
curl -X POST http://localhost:8000/api/v1/approvals/{approval_id}/approve \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Note:** Approving a message does NOT send it. Use the send endpoint to actually send.

---

## Reject Message

Reject a generated message. The message will not be sent.

### Request

No body required.

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "rejected",
  "message": "Message rejected",
  "sent": false
}
```

### Example

```bash
curl -X POST http://localhost:8000/api/v1/approvals/{approval_id}/reject \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Send Message

Send an approved message via GHL (with optional edits).

### Request

```json
{
  "edited_message": "Optional edited version of the message"
}
```

If `edited_message` is not provided, uses `generated_message` or existing `edited_message`.

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "sent",
  "message": "Message sent successfully",
  "sent": true
}
```

### Example

```bash
# Send message as-is
curl -X POST http://localhost:8000/api/v1/approvals/{approval_id}/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Send with edits
curl -X POST http://localhost:8000/api/v1/approvals/{approval_id}/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "edited_message": "Hi! Just wanted to check in on our conversation. Are you still interested?"
  }'
```

---

## Approval Statuses

- **pending**: Message generated, awaiting review
- **approved**: Message approved but not sent yet
- **rejected**: Message rejected, will not be sent
- **sent**: Message sent via GHL

## Typical Workflow

1. **Generate message** → `POST /api/v1/deals/{deal_id}/generate-message`
   - Creates approval with status: `pending`

2. **Review message** → `GET /api/v1/approvals`
   - List pending approvals
   - Review `generated_message`

3. **Approve or reject**:
   - **Approve**: `POST /api/v1/approvals/{id}/approve` → status: `approved`
   - **Reject**: `POST /api/v1/approvals/{id}/reject` → status: `rejected`

4. **Send message** → `POST /api/v1/approvals/{id}/send`
   - Optionally provide `edited_message`
   - Message sent via GHL
   - Status updated to: `sent`

## Quick Approval Flow

If you want to approve and send in one step:

```bash
# 1. Approve
curl -X POST http://localhost:8000/api/v1/approvals/{id}/approve \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. Send
curl -X POST http://localhost:8000/api/v1/approvals/{id}/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Error Responses

### Approval Not Found
```json
{
  "detail": "Approval not found: {approval_id}"
}
```

### Invalid Status
```json
{
  "detail": "Approval is not pending (current status: sent)"
}
```

### Cannot Send Rejected Message
```json
{
  "detail": "Cannot send a rejected message"
}
```

### Message Already Sent
```json
{
  "detail": "Message has already been sent"
}
```

### Send Failed
```json
{
  "detail": "Failed to send message via GHL"
}
```

## Mock Service Behavior

With mock GHL service enabled (`USE_MOCK_GHL=true`):
- Messages are **logged** but not actually sent
- Check logs for: `[MOCK] ✅ SMS would be sent: ...`
- Approval status is still updated to `sent`
- This allows testing the full flow without real SMS sending

## Filtering Examples

```bash
# Get only pending approvals
GET /api/v1/approvals?status_filter=pending

# Get approvals for a specific deal
GET /api/v1/approvals?deal_id=deal-001

# Get sent messages (pagination)
GET /api/v1/approvals?status_filter=sent&limit=20&offset=0
```

