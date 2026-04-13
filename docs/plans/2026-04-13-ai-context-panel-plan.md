# AI Context Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an on-demand side panel to the Revivals page that shows the AI's interpreted context (topics, pain points, sentiment) alongside key evidence snippets, so users can verify what the AI saw when generating a message.

**Architecture:** Snapshot the AI's context analysis + top evidence at generation time, store as JSON in a new `ai_context` column on `ApprovalQueue`, return in the generate-message response, and render in a slide-out panel triggered by a "View AI Context" button.

**Tech Stack:** Python/FastAPI (backend), Alembic (migration), Next.js/React/Tailwind (frontend)

---

### Task 1: Add `ai_context` column to ApprovalQueue

**Files:**
- Modify: `backend/app/models/approval_queue.py:51` (add column after `scheduled_at`)
- Create: `backend/alembic/versions/add_ai_context_to_approval_queue.py`

**Step 1: Add the column to the model**

In `backend/app/models/approval_queue.py`, add after line 51 (`scheduled_at`):

```python
    ai_context = Column(Text, nullable=True)  # JSON snapshot of AI context used for generation
```

**Step 2: Create the Alembic migration**

Create `backend/alembic/versions/add_ai_context_to_approval_queue.py`:

```python
"""Add ai_context column to approval_queue table."""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = None  # Will be set by alembic
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('approval_queue', sa.Column('ai_context', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('approval_queue', 'ai_context')
```

Generate the real migration with:

```bash
cd backend && alembic revision --autogenerate -m "add ai_context to approval_queue"
```

**Step 3: Run the migration**

```bash
cd backend && alembic upgrade head
```

Expected: Migration applies successfully, `ai_context` column exists on `approval_queue`.

**Step 4: Commit**

```bash
git add backend/app/models/approval_queue.py backend/alembic/versions/
git commit -m "feat: add ai_context column to approval_queue"
```

---

### Task 2: Build `_build_context_snapshot()` helper in AI service

**Files:**
- Modify: `backend/app/services/ai.py` (add new method to `AIService` class, after `_analyze_conversation_context`)

**Step 1: Add the helper method**

Add this method to the `AIService` class after `_analyze_conversation_context()` (after line ~659):

```python
    def _build_context_snapshot(
        self,
        context_analysis: Dict[str, Any],
        conversations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build a JSON-serializable snapshot of the AI context for transparency.
        Returns the analysis + top evidence snippets + stats.
        """
        # Extract key topics and pain points for evidence matching
        key_terms = set()
        for field in ['key_topics', 'pain_points', 'interests', 'specific_details']:
            for item in context_analysis.get(field, []):
                key_terms.update(item.lower().split())

        # Separate meeting notes from messages
        meeting_notes = []
        messages = []
        for conv in conversations:
            if conv.get("type") == "meeting_notes":
                meeting_notes.append(conv)
            elif conv.get("content") and conv.get("direction") in ("inbound", "outbound"):
                messages.append(conv)

        # Score messages by relevance (how many key terms they contain)
        scored_messages = []
        for msg in messages:
            content_lower = (msg.get("content") or "").lower()
            score = sum(1 for term in key_terms if term in content_lower)
            scored_messages.append((score, msg))

        # Sort by relevance score (highest first), take top 5
        scored_messages.sort(key=lambda x: x[0], reverse=True)
        top_messages = scored_messages[:5]

        # Build evidence array
        evidence = []

        # Add all meeting notes first (max 3)
        for note in meeting_notes[:3]:
            content = note.get("content", "")
            # Truncate long meeting notes to ~300 chars
            if len(content) > 300:
                content = content[:297] + "..."
            evidence.append({
                "type": "meeting_notes",
                "direction": "context",
                "content": content,
                "date": note.get("sentAt") or note.get("createdAt") or ""
            })

        # Add top relevant messages
        for score, msg in top_messages:
            content = msg.get("content", "")
            # Truncate long messages to ~200 chars
            if len(content) > 200:
                content = content[:197] + "..."
            evidence.append({
                "type": "message",
                "direction": msg.get("direction", "unknown"),
                "content": content,
                "date": msg.get("sentAt") or msg.get("createdAt") or ""
            })

        # Build stats
        total_messages = len([c for c in conversations if c.get("direction") in ("inbound", "outbound")])
        dates = []
        for conv in conversations:
            d = conv.get("sentAt") or conv.get("createdAt")
            if d and isinstance(d, str) and len(d) >= 10:
                dates.append(d[:10])

        date_range = ""
        if dates:
            dates.sort()
            date_range = f"{dates[0]} to {dates[-1]}" if len(dates) > 1 else dates[0]

        return {
            "analysis": {
                "relationship_stage": context_analysis.get("relationship_stage", "unknown"),
                "communication_style": context_analysis.get("communication_style", "unknown"),
                "key_topics": context_analysis.get("key_topics", [])[:5],
                "pain_points": context_analysis.get("pain_points", [])[:3],
                "interests": context_analysis.get("interests", [])[:3],
                "sentiment_trend": context_analysis.get("sentiment_trend", "unknown"),
                "last_interaction_tone": context_analysis.get("last_interaction_tone", "unknown"),
                "specific_details": context_analysis.get("specific_details", [])[:3]
            },
            "evidence": evidence,
            "stats": {
                "total_messages": total_messages,
                "meeting_notes_count": len(meeting_notes),
                "date_range": date_range
            }
        }
```

**Step 2: Commit**

```bash
git add backend/app/services/ai.py
git commit -m "feat: add _build_context_snapshot helper to AIService"
```

---

### Task 3: Wire context snapshot into message generation methods

**Files:**
- Modify: `backend/app/services/ai.py` — `generate_reactivation_message()` (~line 37) and `generate_reactivation_email()` (~line 886)

**Step 1: Update `generate_reactivation_message()` return type and logic**

The method currently returns `List[str]`. Change it to return a tuple `(List[str], Dict[str, Any])` where the second element is the context snapshot.

At line 54, after `context_analysis = self._analyze_conversation_context(conversations)`, add:

```python
        context_snapshot = self._build_context_snapshot(context_analysis, conversations)
```

Change all return statements in this method to return tuples:
- Success returns: `return (messages, context_snapshot)`
- Fallback returns: `return ([fallback_message], context_snapshot)`

**Step 2: Update `generate_reactivation_email()` similarly**

At line 900, after `context_analysis = self._analyze_conversation_context(conversations)`, add:

```python
        context_snapshot = self._build_context_snapshot(context_analysis, conversations)
```

Change return statements:
- Success: `return {"subject": subject, "body": body, "ai_context": context_snapshot}`
- Fallback: `return {"subject": ..., "body": ..., "ai_context": context_snapshot}`

**Step 3: Commit**

```bash
git add backend/app/services/ai.py
git commit -m "feat: return context snapshot from message generation methods"
```

---

### Task 4: Update schema and endpoint to pass context through

**Files:**
- Modify: `backend/app/schemas/message.py:7-16` (add `ai_context` field)
- Modify: `backend/app/api/deals.py:204-296` (capture and store context)

**Step 1: Add `ai_context` to response schema**

In `backend/app/schemas/message.py`, add after line 14 (`email_subject`):

```python
    ai_context: Optional[dict] = None  # AI context snapshot for transparency panel
```

**Step 2: Update the generate-message endpoint**

In `backend/app/api/deals.py`, the email branch (~line 206) currently does:

```python
email_result = ai_service.generate_reactivation_email(...)
generated_messages = [email_result["body"]]
email_subject = email_result["subject"]
```

Change to:

```python
email_result = ai_service.generate_reactivation_email(...)
generated_messages = [email_result["body"]]
email_subject = email_result["subject"]
ai_context = email_result.get("ai_context")
```

The SMS branch (~line 219) currently does:

```python
generated_messages = ai_service.generate_reactivation_message(...)
```

Change to:

```python
generated_messages, ai_context = ai_service.generate_reactivation_message(...)
```

Add `import json` at top if not already present (it is — line 230).

When creating the ApprovalQueue (~line 244), add:

```python
            ai_context=json.dumps(ai_context) if ai_context else None,
```

When building the response (~line 287), add:

```python
            ai_context=ai_context,
```

**Step 3: Commit**

```bash
git add backend/app/schemas/message.py backend/app/api/deals.py
git commit -m "feat: pass ai_context through endpoint and store in approval queue"
```

---

### Task 5: Update frontend API function and state

**Files:**
- Modify: `nextjs-frontend/lib/api.ts:564-570` (add `ai_context` to return type)
- Modify: `nextjs-frontend/app/(app)/revivals/page.tsx:25-50` (add state, capture from response)

**Step 1: Update `generateMessage` return type in `api.ts`**

In `nextjs-frontend/lib/api.ts`, at line 564, add `ai_context` to the Promise type:

```typescript
export async function generateMessage(dealId: string, channel: "sms" | "email" | "both" = "sms"): Promise<{
  message: string
  approval_id: string
  generated_messages?: string[]
  message_sequence?: Array<{ message: string; order: number; delay_seconds: number }>
  email_subject?: string
  ai_context?: {
    analysis: {
      relationship_stage: string
      communication_style: string
      key_topics: string[]
      pain_points: string[]
      interests: string[]
      sentiment_trend: string
      last_interaction_tone: string
      specific_details: string[]
    }
    evidence: Array<{
      type: string
      direction: string
      content: string
      date: string
    }>
    stats: {
      total_messages: number
      meeting_notes_count: number
      date_range: string
    }
  }
}>
```

**Step 2: Add state and capture in revivals page**

In `nextjs-frontend/app/(app)/revivals/page.tsx`, add state after line 38 (`emailSubject`):

```typescript
  const [aiContext, setAiContext] = useState<any>(null)
  const [showContextPanel, setShowContextPanel] = useState(false)
```

At line 233, after the `generateMessage` call, capture context:

```typescript
      setAiContext(result.ai_context || null)
      setShowContextPanel(false) // Reset panel on new generation
```

**Step 3: Commit**

```bash
git add nextjs-frontend/lib/api.ts "nextjs-frontend/app/(app)/revivals/page.tsx"
git commit -m "feat: add ai_context state and type to frontend"
```

---

### Task 6: Build the Context Panel component

**Files:**
- Create: `nextjs-frontend/components/ai-context-panel.tsx`

**Step 1: Create the component**

Create `nextjs-frontend/components/ai-context-panel.tsx`:

```tsx
"use client"

import { X, Brain, MessageSquare, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIContextPanelProps {
  context: {
    analysis: {
      relationship_stage: string
      communication_style: string
      key_topics: string[]
      pain_points: string[]
      interests: string[]
      sentiment_trend: string
      last_interaction_tone: string
      specific_details: string[]
    }
    evidence: Array<{
      type: string
      direction: string
      content: string
      date: string
    }>
    stats: {
      total_messages: number
      meeting_notes_count: number
      date_range: string
    }
  }
  onClose: () => void
}

const sentimentConfig: Record<string, { color: string; icon: any; label: string }> = {
  positive: { color: "text-green-600 bg-green-50 border-green-200", icon: TrendingUp, label: "Positive" },
  negative: { color: "text-red-500 bg-red-50 border-red-200", icon: TrendingDown, label: "Negative" },
  neutral: { color: "text-gray-500 bg-gray-50 border-gray-200", icon: Minus, label: "Neutral" },
  mixed: { color: "text-amber-500 bg-amber-50 border-amber-200", icon: TrendingUp, label: "Mixed" },
}

const directionConfig: Record<string, { label: string; color: string }> = {
  inbound: { label: "Prospect", color: "bg-blue-100 text-blue-700" },
  outbound: { label: "You", color: "bg-gray-100 text-gray-700" },
  context: { label: "Meeting", color: "bg-purple-100 text-purple-700" },
}

export function AIContextPanel({ context, onClose }: AIContextPanelProps) {
  const { analysis, evidence, stats } = context
  const sentiment = sentimentConfig[analysis.sentiment_trend] || sentimentConfig.neutral

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-[#E5E7EB] shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#6C5CE7]" />
          <h3 className="font-semibold text-[#111827] text-sm">AI Context</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
          <X className="h-4 w-4 text-[#6B7280]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary badges */}
        <div className="px-5 py-4 space-y-3 border-b border-[#F3F4F6]">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#6C5CE7]/10 text-[#6C5CE7] border border-[#6C5CE7]/20">
              {analysis.relationship_stage.charAt(0).toUpperCase() + analysis.relationship_stage.slice(1)}-stage
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {analysis.communication_style.charAt(0).toUpperCase() + analysis.communication_style.slice(1)}
            </span>
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", sentiment.color)}>
              <sentiment.icon className="h-3 w-3" />
              {sentiment.label}
            </span>
          </div>
        </div>

        {/* Key Topics */}
        {analysis.key_topics.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Key Topics</h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.key_topics.map((topic, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#F3F4F6] text-[#374151]">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {analysis.pain_points.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Pain Points</h4>
            <ul className="space-y-1">
              {analysis.pain_points.map((point, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">&#x2022;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interests */}
        {analysis.interests.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Interests</h4>
            <ul className="space-y-1">
              {analysis.interests.map((interest, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-green-400 mt-0.5">&#x2022;</span>
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specific Details */}
        {analysis.specific_details.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Specific Details</h4>
            <ul className="space-y-1">
              {analysis.specific_details.map((detail, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-[#6C5CE7] mt-0.5">&#x2022;</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Evidence</h4>
            <div className="space-y-3">
              {evidence.map((item, i) => {
                const dir = directionConfig[item.direction] || directionConfig.context
                const ismeeting = item.type === "meeting_notes"
                return (
                  <div key={i} className="rounded-lg border border-[#E5E7EB] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium", dir.color)}>
                        {ismeeting ? <FileText className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
                        {ismeeting ? "Meeting Notes" : dir.label}
                      </span>
                      {item.date && (
                        <span className="text-[10px] text-[#9CA3AF]">{item.date}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <p className="text-[10px] text-[#9CA3AF] text-center">
          Based on {stats.total_messages} message{stats.total_messages !== 1 ? 's' : ''}
          {stats.meeting_notes_count > 0 && ` and ${stats.meeting_notes_count} meeting note${stats.meeting_notes_count !== 1 ? 's' : ''}`}
          {stats.date_range && ` (${stats.date_range})`}
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add nextjs-frontend/components/ai-context-panel.tsx
git commit -m "feat: create AIContextPanel component"
```

---

### Task 7: Wire the panel into the Revivals page

**Files:**
- Modify: `nextjs-frontend/app/(app)/revivals/page.tsx`

**Step 1: Add import at top of file**

```typescript
import { AIContextPanel } from "@/components/ai-context-panel"
```

**Step 2: Add "View AI Context" button**

Find the area where the generated message actions are (near the regenerate/edit/approve buttons). Add a button:

```tsx
{aiContext && (
  <button
    onClick={() => setShowContextPanel(true)}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6C5CE7] bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 rounded-lg hover:bg-[#6C5CE7]/10 transition-colors"
  >
    <Brain className="h-3 w-3" />
    View AI Context
  </button>
)}
```

Import `Brain` from lucide-react at the top.

**Step 3: Render the panel**

At the end of the component JSX (before the closing fragment or wrapper div), add:

```tsx
{showContextPanel && aiContext && (
  <>
    <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowContextPanel(false)} />
    <AIContextPanel context={aiContext} onClose={() => setShowContextPanel(false)} />
  </>
)}
```

**Step 4: Reset context when selecting a new deal**

In the deal selection handler (wherever `setSelectedDeal` is called), add:

```typescript
setAiContext(null)
setShowContextPanel(false)
```

**Step 5: Commit**

```bash
git add "nextjs-frontend/app/(app)/revivals/page.tsx"
git commit -m "feat: wire AI context panel into revivals page"
```

---

### Task 8: Handle context for existing approvals loaded from DB

**Files:**
- Modify: `nextjs-frontend/app/(app)/revivals/page.tsx` (where existing approvals are loaded, ~lines 508-585)
- Modify: `nextjs-frontend/lib/api.ts` (if approval response includes `ai_context`)

**Step 1: Parse `ai_context` from loaded approvals**

When loading an existing approval from the backend (the section that parses `approval.generated_message`), also check for `ai_context`:

```typescript
if (approval.ai_context) {
  const ctx = typeof approval.ai_context === 'string'
    ? JSON.parse(approval.ai_context)
    : approval.ai_context
  setAiContext(ctx)
} else {
  setAiContext(null)
}
```

**Step 2: Commit**

```bash
git add "nextjs-frontend/app/(app)/revivals/page.tsx" nextjs-frontend/lib/api.ts
git commit -m "feat: load ai_context from existing approvals"
```

---

### Task 9: Deploy and verify

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Verify on deployed app**

1. Open Revivals page
2. Select a lead and generate a message
3. Confirm "View AI Context" button appears
4. Click it — panel should slide in showing topics, pain points, evidence
5. Verify evidence snippets explain where terms like "quiz funnel" come from
6. Close panel by clicking X or clicking the backdrop
7. Select a different lead — panel should reset
8. Verify old approvals (without ai_context) don't show the button
