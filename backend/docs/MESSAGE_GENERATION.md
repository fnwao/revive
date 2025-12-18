# Message Generation Endpoint

The message generation endpoint creates AI-powered reactivation messages for stalled deals using OpenAI GPT-4.

## Endpoint

```
POST /api/v1/deals/{deal_id}/generate-message
```

**Authentication:** Required (Bearer token)

## Request

No request body needed - deal_id is in the URL path.

## Response

```json
{
  "approval_id": "550e8400-e29b-41d4-a716-446655440000",
  "deal_id": "deal-001",
  "generated_message": "Hi! Wanted to follow up on our conversation about Acme Corp. It's been a while since we last connected. Are you still interested in moving forward? Happy to answer any questions!",
  "status": "pending",
  "created_at": "2024-01-11T00:00:00Z"
}
```

## How It Works

1. **Fetches deal details** from GHL (or mock service)
2. **Retrieves conversation history** (last 10-20 messages)
3. **Calls OpenAI GPT-4** with:
   - Deal context (title, value, status, days inactive)
   - Recent conversation history
   - Instructions for professional, consultative tone
4. **Stores message** in approval queue (status: pending)
5. **Returns generated message** for review

## Example Usage

### Using cURL

```bash
# Set your API key
export API_KEY="your-api-key-here"

# Generate message for a deal
curl -X POST http://localhost:8000/api/v1/deals/deal-001/generate-message \
  -H "Authorization: Bearer $API_KEY"
```

### Using Python

```python
import httpx

api_key = "your-api-key-here"
base_url = "http://localhost:8000"

# Generate message
response = httpx.post(
    f"{base_url}/api/v1/deals/deal-001/generate-message",
    headers={"Authorization": f"Bearer {api_key}"}
)

data = response.json()
print(f"Generated message: {data['generated_message']}")
print(f"Approval ID: {data['approval_id']}")
```

## AI Prompt Engineering

The system prompt instructs GPT-4 to:
- Be conversational and friendly, not pushy
- Reference prior conversation naturally
- Create gentle urgency without being aggressive
- Keep it short and personal (SMS format, max 160 chars)
- Focus on value and next steps
- Match the tone of prior messages

### Example Generated Messages

**For a deal with prior conversation:**
> "Hi! Wanted to follow up on our conversation about the Enterprise Package. It's been a while since we last connected. Are you still interested in moving forward? Happy to answer any questions!"

**For a deal with minimal conversation:**
> "Hi! Just checking in on Acme Corp. It's been a while since we last spoke. Would love to reconnect and see how we can help move things forward. Let me know when works for you!"

## Message Characteristics

- **Length:** Max 160 characters (SMS limit)
- **Tone:** Professional, consultative, friendly
- **Style:** Matches prior conversation tone
- **Content:** References deal context and prior messages
- **Purpose:** Re-engage without being pushy

## Error Responses

### Deal Not Found
```json
{
  "detail": "Deal not found: deal-999"
}
```

### OpenAI API Error
If OpenAI API fails, a fallback template message is generated:
> "Hi! Wanted to follow up on {deal_title}. It's been a while since we last connected. Are you still interested in moving forward? Happy to answer any questions!"

## Next Steps

After generating a message:

1. **Review the message** - Check the `generated_message` field
2. **Approve or edit** - Use approval endpoints:
   - `GET /api/v1/approvals` - List pending approvals
   - `POST /api/v1/approvals/{id}/approve` - Approve as-is
   - `POST /api/v1/approvals/{id}/send` - Send with optional edits
3. **Send message** - Once approved, message is sent via GHL

## Cost Considerations

Each message generation:
- Uses GPT-4 (more expensive but better quality)
- Typically costs ~$0.01-0.03 per message
- Includes conversation history in context (increases cost slightly)

For cost optimization:
- Consider using GPT-3.5-turbo for lower cost
- Limit conversation history to last 10 messages
- Cache generated messages for similar deals

## Testing with Mock Data

With mock GHL service, you can test with any of the mock deal IDs:
- `deal-001` through `deal-005`

The mock service will return realistic conversation history, and OpenAI will generate context-aware messages based on that history.

## Configuration

The AI service uses:
- **Model:** GPT-4 (configurable in `app/services/ai.py`)
- **Temperature:** 0.7 (slightly creative but professional)
- **Max tokens:** 200 (enough for SMS length)
- **Max message length:** 160 characters (SMS limit)

