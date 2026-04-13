# AI Context Panel — Design Document

**Date:** 2026-04-13
**Status:** Approved

## Problem

Generated messages sometimes reference topics (e.g. "quiz funnel") that users can't verify. The AI pulls from GHL conversations, contact metadata, and meeting transcripts, but none of this context is visible in the UI. Users need transparency into what the AI saw to trust and correct its output.

## Solution

An on-demand side panel that shows the AI's interpreted context alongside key evidence from the source data. Context is snapshotted at generation time so it always reflects exactly what the AI used.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Collapsible right side panel | Keeps main workflow intact, standard pattern |
| Content | AI interpretation + key quotes | Users want to verify, not re-read everything |
| Interactivity | Read-only | Simpler; feedback loop via regeneration is sufficient |
| Trigger | On-demand "View AI Context" button | Keeps UI uncluttered for the happy path |
| Storage | Snapshot at generation time | Guarantees context matches what AI actually used |

## Data Shape

Stored as `ai_context` JSON TEXT column on `ApprovalQueue`:

```json
{
  "analysis": {
    "relationship_stage": "early|mid|advanced",
    "communication_style": "formal|casual|technical|friendly|brief|detailed",
    "key_topics": ["topic1", "topic2"],
    "pain_points": ["pain1", "pain2"],
    "interests": ["interest1", "interest2"],
    "sentiment_trend": "positive|neutral|negative|mixed",
    "last_interaction_tone": "positive|neutral|negative|questioning|interested",
    "specific_details": ["detail1", "detail2"]
  },
  "evidence": [
    {
      "type": "message|meeting_notes",
      "direction": "inbound|outbound|context",
      "content": "Truncated snippet...",
      "date": "2026-03-15"
    }
  ],
  "stats": {
    "total_messages": 12,
    "meeting_notes_count": 1,
    "date_range": "2026-03-01 to 2026-03-16"
  }
}
```

Evidence array contains top 5-8 most relevant snippets (messages containing extracted topics/pain points, plus all meeting notes).

## Backend Changes

1. **New column**: `ai_context` TEXT (nullable) on `approval_queue` table via Alembic migration
2. **New helper**: `AIService._build_context_snapshot(context_analysis, conversations)` — builds the JSON shape above, selecting top evidence snippets
3. **Modified endpoint**: `/deals/{deal_id}/generate-message` saves `ai_context` to ApprovalQueue and returns it in response
4. **Schema update**: `GenerateMessageResponse` gets optional `ai_context: Optional[Dict]`

## Frontend Changes

1. **"View AI Context" button**: Secondary button with icon, appears after message generation or when loading existing approval with stored context
2. **Side panel** (~350px, slides from right):
   - Summary card: relationship stage badge, sentiment indicator (color-coded), communication style tag
   - Key Topics: pill badges, highlighted if referenced in generated message
   - Pain Points & Interests: bulleted lists
   - Evidence: scrollable list with date, direction badge, content snippet
   - Stats footer: message count, meeting note count, date range
3. **Close**: X button or click outside

## Backward Compatibility

- Existing approvals have `ai_context = NULL` — button hidden for those
- No breaking API changes — `ai_context` is optional in response
- No frontend regressions — panel is additive UI only
