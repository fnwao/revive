"""AI service for message generation using Anthropic Claude."""
from typing import List, Dict, Any, Optional
import anthropic
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered message generation."""

    def __init__(self):
        """Initialize Anthropic client."""
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-5"

    def _call_claude(self, system: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 1000, json_mode: bool = False) -> str:
        """Helper to call Claude API and return text response."""
        if json_mode:
            system += "\n\nIMPORTANT: Respond with valid JSON only. No additional text or explanation outside the JSON."

        print(f"[CLAUDE] Calling model={self.model}, max_tokens={max_tokens}, prompt_len={len(user_prompt)}", flush=True)
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": user_prompt}],
            )
            result = response.content[0].text.strip()
            print(f"[CLAUDE] Response received, length={len(result)}", flush=True)
            return result
        except Exception as e:
            print(f"[CLAUDE] API FAILED: {type(e).__name__}: {str(e)}", flush=True)
            raise

    def generate_reactivation_message(
        self,
        deal_title: str,
        deal_value: Optional[float],
        deal_status: str,
        days_since_activity: int,
        conversations: List[Dict[str, Any]],
        max_length: int = 160,
        feedback: Optional[str] = None,
        previous_message: Optional[str] = None,
        generate_sequence: bool = True
    ) -> List[str]:
        """
        Generate reactivation messages for a stalled deal. Returns 3-4 shorter messages
        to simulate natural human conversation flow.
        """
        # Deeply analyze conversation context first
        context_analysis = self._analyze_conversation_context(conversations)

        # Format conversation history
        conversation_text = self._format_conversations(conversations)

        # Build comprehensive system prompt
        system_prompt = f"""You are an expert sales representative and copywriter reactivating a stalled deal. You combine deep understanding of this specific prospect with proven sales, copywriting, and follow-up best practices.

CONTEXT ANALYSIS:
- Relationship Stage: {context_analysis['relationship_stage']}
- Prospect's Communication Style: {context_analysis['communication_style']}
- Key Topics Discussed: {', '.join(context_analysis['key_topics'][:5]) if context_analysis['key_topics'] else 'None identified'}
- Pain Points Mentioned: {', '.join(context_analysis['pain_points'][:3]) if context_analysis['pain_points'] else 'None identified'}
- Interests Shown: {', '.join(context_analysis['interests'][:3]) if context_analysis['interests'] else 'None identified'}
- Sentiment Trend: {context_analysis['sentiment_trend']}
- Last Interaction Tone: {context_analysis['last_interaction_tone']}
- Specific Details to Reference: {', '.join(context_analysis['specific_details'][:3]) if context_analysis['specific_details'] else 'None'}

SALES BEST PRACTICES TO FOLLOW:
1. AIDA Framework (Attention, Interest, Desire, Action):
   - Attention: Open with something relevant and specific to grab attention
   - Interest: Create interest by addressing their specific situation
   - Desire: Build desire by showing value/benefits relevant to their pain points/interests
   - Action: Include a clear, low-pressure call-to-action

2. Value-First Approach:
   - Lead with value, not features
   - Focus on benefits that solve their specific pain points
   - Show ROI or outcomes, not just product details
   - Make it about them, not about you

3. Consultative Selling:
   - Ask questions or offer to help solve problems
   - Position yourself as a trusted advisor
   - Show you understand their business/needs
   - Offer insights or resources, not just pitches

4. Soft Urgency (Not Pressure):
   - Create gentle urgency through value (limited-time insights, relevant updates)
   - Never use high-pressure tactics
   - Focus on "opportunity" not "deadline"
   - Use phrases like "thought you'd find this valuable" not "act now"

5. Objection Prevention:
   - Address potential concerns proactively
   - If objections were raised, acknowledge and provide solutions
   - Remove friction points (easy next steps, no commitment language)

COPYWRITING BEST PRACTICES:
1. Clarity Over Cleverness:
   - Be clear and direct, not clever or confusing
   - Use simple, conversational language
   - Avoid jargon unless the prospect uses it
   - One main idea per message

2. Benefit-Focused Language:
   - Lead with benefits, not features
   - Use "you" and "your" more than "we" and "our"
   - Show outcomes and results
   - Paint a picture of success

3. Power Words (Use Sparingly):
   - Specific: "exactly", "specifically", "precisely"
   - Value: "save", "increase", "improve", "reduce"
   - Urgency (soft): "timely", "relevant", "opportunity"
   - Personal: "you", "your", "together"

4. Specificity:
   - Use specific numbers, dates, or details when possible
   - Reference specific conversations or topics
   - Avoid vague phrases like "great opportunity" - be specific
   - Use concrete examples relevant to their situation

5. Emotional Triggers (Appropriately):
   - Appeal to desired outcomes (growth, efficiency, success)
   - Address fears/concerns (wasted time, missed opportunities)
   - Use positive emotions (excitement, confidence, relief)
   - Match emotional tone to their sentiment

FOLLOW-UP BEST PRACTICES:
1. Value-Add Approach:
   - Every follow-up should add value (insight, resource, update)
   - Never just "checking in" - have a reason
   - Share something relevant to their interests/pain points
   - Offer to help, not just sell

2. Appropriate Timing Acknowledgment:
   - Acknowledge the time gap naturally ("I know it's been a while...")
   - Don't apologize excessively
   - Focus forward, not backward
   - Show you respect their time

3. Multiple Touchpoint Strategy:
   - Reference previous conversations naturally
   - Show continuity in relationship
   - Build on past discussions
   - Demonstrate you remember them

4. Low-Pressure CTA:
   - Use soft CTAs: "Would love to hear your thoughts", "Happy to discuss", "Let me know if helpful"
   - Avoid: "Let's schedule a call", "Buy now", "Sign up today"
   - Make it easy to respond (yes/no questions, simple options)
   - Give them an out ("No pressure", "If timing isn't right")

5. Relationship Building:
   - Show genuine interest in their success
   - Offer help without immediate expectation
   - Build trust through consistency
   - Position as long-term partner, not one-time seller

PERSONALIZATION GUIDELINES:
1. Reference specific details from conversation analysis
2. Match communication style ({context_analysis['communication_style']})
3. Address relationship stage appropriately
4. Use sentiment-aware language
5. Reference pain points, interests, or specific details naturally

MESSAGE STRUCTURE (for SMS, max 160 characters):
- Opening: Attention-grabbing, personalized hook (reference specific detail)
- Middle: Value proposition or benefit relevant to their context
- Closing: Soft CTA with easy next step

CRITICAL RULES:
- Never sound like a template or generic message
- Always be specific and personalized
- Lead with value, not features
- Keep it conversational and human
- Make it about them, not you
- Use proven sales/copywriting principles naturally"""

        # Build user prompt with context
        value_str = f"${deal_value:,.2f}" if deal_value else "Not specified"

        # If feedback is provided, this is a regeneration request
        if feedback and previous_message:
            context_summary = f"""
CONTEXT SUMMARY:
- Relationship Stage: {context_analysis['relationship_stage']}
- Communication Style: {context_analysis['communication_style']}
- Key Topics: {', '.join(context_analysis['key_topics'][:3]) if context_analysis['key_topics'] else 'General discussion'}
- Pain Points: {', '.join(context_analysis['pain_points'][:2]) if context_analysis['pain_points'] else 'None identified'}
- Interests: {', '.join(context_analysis['interests'][:2]) if context_analysis['interests'] else 'General interest'}
- Sentiment: {context_analysis['sentiment_trend']} (last interaction: {context_analysis['last_interaction_tone']})
- Specific Details to Reference: {', '.join(context_analysis['specific_details'][:2]) if context_analysis['specific_details'] else 'None'}
"""

            user_prompt = f"""Regenerate a reactivation SMS message for this stalled deal based on user feedback, using deep context understanding:

DEAL CONTEXT:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago

FULL CONVERSATION HISTORY (most recent first):
{conversation_text}

{context_summary}

PREVIOUS MESSAGE (that received feedback):
"{previous_message}"

USER FEEDBACK:
"{feedback}"

REGENERATION INSTRUCTIONS (Following Sales, Copywriting & Follow-up Best Practices):
1. INCORPORATE FEEDBACK: Address the user's feedback while maintaining sales/copywriting best practices

2. MAINTAIN BEST PRACTICES:
   - Follow AIDA framework (Attention, Interest, Desire, Action)
   - Use benefit-focused language
   - Lead with value, not features
   - Include soft, low-pressure CTA
   - Add value, don't just "check in"

3. PERSONALIZATION:
   - Use context analysis to keep message highly personalized
   - Reference specific conversation details (topics, pain points, interests, specific details)
   - Match prospect's communication style ({context_analysis['communication_style']})

4. STRUCTURE:
   - Opening: Personalized hook with specific detail
   - Middle: Value proposition relevant to their context
   - Closing: Soft CTA with easy next step

5. TONE:
   - Natural and conversational
   - Consultative, not pushy
   - Human, not templated

Generate a short SMS message (max {max_length} characters) that:
- Addresses the user's feedback
- Follows sales, copywriting, and follow-up best practices
- Maintains deep personalization using context analysis
- References specific conversation details naturally
- Matches prospect's communication style
- Adds value with benefit-focused language
- Includes soft, low-pressure CTA
- Sounds natural and human, not templated or salesy

NOTE: If the message is longer than {max_length} characters, use natural line breaks (\\n) at sentence boundaries or after commas for better readability. The system will automatically split very long messages into multiple messages."""
        else:
            # Add intelligent context analysis
            value_context = ""
            if deal_value:
                if deal_value >= 25000:
                    value_context = "HIGH-VALUE DEAL: This is a high-value opportunity. Emphasize ROI and strategic value."
                elif deal_value >= 10000:
                    value_context = "MEDIUM-VALUE DEAL: Focus on value proposition and benefits."

            urgency_context = ""
            if days_since_activity > 30:
                urgency_context = "URGENT: Deal has been inactive for over a month. Acknowledge the gap but focus on forward momentum."
            elif days_since_activity > 14:
                urgency_context = "MODERATE URGENCY: Deal inactive for 2+ weeks. Re-engage with value-focused message."

            context_summary = f"""
CONTEXT SUMMARY:
- Relationship Stage: {context_analysis['relationship_stage']}
- Communication Style: {context_analysis['communication_style']}
- Key Topics: {', '.join(context_analysis['key_topics'][:3]) if context_analysis['key_topics'] else 'General discussion'}
- Pain Points: {', '.join(context_analysis['pain_points'][:2]) if context_analysis['pain_points'] else 'None identified'}
- Interests: {', '.join(context_analysis['interests'][:2]) if context_analysis['interests'] else 'General interest'}
- Sentiment: {context_analysis['sentiment_trend']} (last interaction: {context_analysis['last_interaction_tone']})
- Specific Details to Reference: {', '.join(context_analysis['specific_details'][:2]) if context_analysis['specific_details'] else 'None'}
"""

            if generate_sequence:
                user_prompt = f"""Generate a sequence of 3-4 short, natural SMS messages for reactivating this stalled deal.
These messages should feel like a human sending multiple quick texts, not one long message.

DEAL CONTEXT:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago
{value_context}
{urgency_context}

FULL CONVERSATION HISTORY (most recent first):
{conversation_text}

{context_summary}

CRITICAL INSTRUCTIONS FOR MESSAGE SEQUENCE:
1. MESSAGE COUNT: Generate exactly 3-4 messages (prefer 3 for shorter sequences, 4 if more context needed)

2. MESSAGE LENGTH: Each message should be 40-120 characters (short, natural SMS length). Don't make them too long.

3. NATURAL FLOW:
   - Message 1: Opening hook - personalized greeting, reference specific detail
   - Message 2: Value/benefit - add value, reference their context
   - Message 3: Soft CTA or additional value - gentle next step or helpful info
   - Message 4 (optional): Closing thought or additional value - only if needed

4. HUMAN-LIKE BEHAVIOR:
   - Messages should feel like quick texts, not a formal email
   - Use natural breaks (don't try to fit everything in one message)
   - Each message can stand alone but builds on previous ones
   - Use casual transitions between messages ("Also...", "BTW...", "Quick question...")
   - Vary message length (some shorter, some slightly longer)

5. PERSONALIZATION:
   - Reference specific conversation details naturally
   - Match communication style ({context_analysis['communication_style']})
   - Address relationship stage appropriately
   - Use sentiment-aware language

6. VALUE-ADD:
   - Each message should add some value or context
   - Never just "checking in" - have a reason for each message
   - Offer something relevant to their interests/pain points

7. TONE:
   - Conversational and human
   - Consultative, not pushy
   - Friendly and helpful
   - Professional but warm

8. CTA PLACEMENT:
   - Soft CTA in message 2 or 3 (not all messages need CTAs)
   - Use soft language: "Would love your thoughts", "Happy to discuss", "Let me know if helpful"
   - Make it easy to respond

Generate the messages as a JSON array with this exact format:
{{
  "messages": [
    "First short message (40-120 chars)",
    "Second short message (40-120 chars)",
    "Third short message (40-120 chars)",
    "Fourth short message (40-120 chars)"
  ]
}}

Each message should:
- Be 40-120 characters
- Feel natural and human
- Add value or context
- Reference specific details from conversation
- Match prospect's communication style
- Sound like quick texts, not formal messages"""
            else:
                user_prompt = f"""Generate a highly personalized, context-aware reactivation SMS message for this stalled deal:

DEAL CONTEXT:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago
{value_context}
{urgency_context}

FULL CONVERSATION HISTORY (most recent first):
{conversation_text}

{context_summary}

CRITICAL INSTRUCTIONS (Following Sales, Copywriting & Follow-up Best Practices):
1. OPENING (Attention): Start with a personalized hook - reference a specific detail (topic, pain point, interest, or conversation detail)

2. MIDDLE (Interest + Desire):
   - Show value relevant to their specific context
   - If pain points identified: Show how you can help solve them
   - If interests shown: Reference those with a benefit
   - Use benefit-focused language ("you'll save", "you'll increase", not "we offer")
   - Be specific, not vague

3. CLOSING (Action):
   - Soft, low-pressure CTA ("Would love your thoughts", "Happy to discuss", "Let me know if helpful")
   - Make it easy to respond
   - No high-pressure language

4. PERSONALIZATION:
   - Reference specific conversation details naturally
   - Match communication style ({context_analysis['communication_style']})
   - Address relationship stage appropriately
   - Use sentiment-aware language

5. TIMING ACKNOWLEDGMENT:
   - Acknowledge {days_since_activity}-day gap naturally if >14 days ("I know it's been a while...")
   - Focus forward, not backward
   - Don't over-apologize

6. VALUE-ADD:
   - Every message must add value (insight, resource, relevant update)
   - Never just "checking in"
   - Offer something relevant to their interests/pain points

7. TONE:
   - Conversational and human
   - Consultative, not pushy
   - Friendly and helpful
   - Professional but warm

Generate a short SMS message (max {max_length} characters) that:
- Follows AIDA framework naturally
- Uses benefit-focused copywriting principles
- Implements follow-up best practices
- Is highly personalized using context analysis
- References specific conversation details
- Matches prospect's communication style
- Adds value, not just "checking in"
- Has a soft, low-pressure CTA
- Sounds natural and human, not templated or salesy

NOTE: If the message is longer than {max_length} characters, use natural line breaks (\\n) at sentence boundaries or after commas for better readability. The system will automatically split very long messages into multiple messages."""

        try:
            if generate_sequence and not feedback:
                # Generate message sequence
                logger.info(f"Generating SMS sequence for deal: {deal_title}")
                result_text = self._call_claude(
                    system=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.7,
                    max_tokens=600,
                    json_mode=True
                )
                print(f"[CLAUDE] Raw SMS response: {result_text[:300]}", flush=True)

                result = self._parse_json_response(result_text)
                messages = result.get("messages", [])

                # Validate and clean messages
                if not messages or len(messages) < 2:
                    logger.warning(f"AI generated fewer than 2 messages ({len(messages)}), falling back to single message")
                    return self._generate_single_message_fallback(deal_title, days_since_activity, max_length)

                # Ensure each message is within max length and trim to 3-4 messages
                cleaned_messages = []
                for msg in messages[:4]:  # Max 4 messages
                    msg_clean = msg.strip()
                    if len(msg_clean) > max_length:
                        msg_clean = msg_clean[:max_length-3] + "..."
                    if len(msg_clean) >= 20:  # Minimum reasonable length
                        cleaned_messages.append(msg_clean)

                if len(cleaned_messages) < 2:
                    logger.warning("Not enough valid messages, falling back to single message")
                    return self._generate_single_message_fallback(deal_title, days_since_activity, max_length)

                logger.info(f"Generated {len(cleaned_messages)} messages for natural conversation flow")
                return cleaned_messages
            else:
                # Single message generation (for feedback/regeneration or when sequence disabled)
                message = self._call_claude(
                    system=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.7,
                    max_tokens=200,
                )

                # Handle long messages: split or add line breaks
                if len(message) > max_length * 2:
                    logger.info(f"Message is very long ({len(message)} chars), splitting into multiple messages")
                    split_messages = self._split_long_message(message, max_length)
                    if split_messages:
                        logger.info(f"Split into {len(split_messages)} messages")
                        return split_messages

                # If message is moderately long, add line breaks
                if len(message) > max_length:
                    logger.info(f"Message is long ({len(message)} chars), adding line breaks for readability")
                    message = self._add_line_breaks(message, max_length)

                # Final check
                if len(message) > max_length:
                    logger.warning(f"Generated message ({len(message)} chars) exceeds max length ({max_length})")
                    message = message[:max_length-3] + "..."

                logger.info(f"Generated message ({len(message)} chars): {message[:50]}...")
                return [message]

        except Exception as e:
            print(f"[ANTHROPIC ERROR] {type(e).__name__}: {str(e)}", flush=True)
            import traceback
            print(f"[ANTHROPIC TRACEBACK] {traceback.format_exc()}", flush=True)
            if generate_sequence:
                return self._generate_single_message_fallback(deal_title, days_since_activity, max_length)
            else:
                return [self._generate_fallback_message(deal_title, days_since_activity)]

    def _generate_single_message_fallback(self, deal_title: str, days_since_activity: int, max_length: int) -> List[str]:
        """Generate a fallback single message if sequence generation fails."""
        message = self._generate_fallback_message(deal_title, days_since_activity)
        if len(message) > max_length:
            message = message[:max_length-3] + "..."
        return [message]

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Robustly parse JSON from Claude's response, handling markdown code blocks and extra text."""
        import re
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code blocks
        code_block = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if code_block:
            try:
                return json.loads(code_block.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding JSON object in the text
        brace_match = re.search(r'\{.*\}', text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        # Try finding JSON array in the text
        bracket_match = re.search(r'\[.*\]', text, re.DOTALL)
        if bracket_match:
            try:
                arr = json.loads(bracket_match.group(0))
                return {"messages": arr}
            except json.JSONDecodeError:
                pass

        raise json.JSONDecodeError("Could not extract JSON from response", text, 0)

    def _format_conversations(self, conversations: List[Dict[str, Any]], limit: int = 20) -> str:
        """Format conversation history for prompt with enhanced context."""
        if not conversations:
            return "No prior conversation history."

        recent = conversations[:limit]
        meeting_notes = []
        messages = []

        for msg in recent:
            direction = msg.get("direction", "unknown")
            content = msg.get("content", "")
            msg_type = msg.get("type", "message")

            # Separate meeting notes from regular messages
            if direction == "context" or msg_type == "meeting_notes":
                meeting_notes.append(content)
                continue

            sent_at = msg.get("sentAt", msg.get("createdAt", ""))
            timestamp = ""
            if sent_at:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
                    timestamp = dt.strftime("%m/%d/%Y")
                except:
                    pass

            label = "You (Sales Rep)" if direction == "outbound" else "Prospect"
            type_label = f"[{msg_type.upper()}]" if msg_type != "message" else ""
            messages.append(f"{len(messages)+1}. {type_label} [{label}] ({timestamp}): {content}".strip())

        formatted = []
        if meeting_notes:
            formatted.append("=== MEETING NOTES (from Fireflies.ai call recordings) ===")
            formatted.extend(meeting_notes)
            formatted.append("=== END MEETING NOTES ===\n")

        if messages:
            formatted.append("MESSAGE HISTORY:")
            formatted.extend(messages)
        elif not meeting_notes:
            formatted.append("No prior conversation history.")

        return "\n".join(formatted)

    def _analyze_conversation_context(self, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Deeply analyze conversation history to extract key insights about the lead."""
        if not conversations or len(conversations) == 0:
            return {
                "relationship_stage": "early",
                "communication_style": "neutral",
                "key_topics": [],
                "pain_points": [],
                "interests": [],
                "objections": [],
                "sentiment_trend": "neutral",
                "last_interaction_tone": "neutral",
                "specific_details": []
            }

        # If only meeting notes (no real messages), use basic analysis to save API call
        real_messages = [c for c in conversations if c.get("direction") not in ("context",) and c.get("type") != "meeting_notes"]
        if len(real_messages) < 2:
            return self._basic_conversation_analysis(conversations)

        conversation_text = self._format_conversations(conversations, limit=20)

        analysis_prompt = f"""Analyze this conversation history between a sales rep and a prospect. Extract deep insights about the relationship and context.

Conversation History:
{conversation_text}

Analyze and extract:
1. Relationship Stage: How far along is this relationship? (early/initial contact, mid/engaged discussion, advanced/close to decision)
2. Communication Style: What's the prospect's communication style? (formal, casual, technical, friendly, brief, detailed)
3. Key Topics: What are the main topics, products, or services discussed? (list 3-5 key topics)
4. Pain Points: What problems, challenges, or concerns has the prospect mentioned? (list specific pain points)
5. Interests: What has the prospect shown interest in? (features, benefits, use cases, etc.)
6. Objections: Any objections, hesitations, or concerns raised? (list if any)
7. Sentiment Trend: Overall sentiment across the conversation (positive, neutral, negative, mixed)
8. Last Interaction Tone: Tone of the most recent message (positive, neutral, negative, questioning, interested)
9. Specific Details: Important specific details to reference (names, dates, specific features mentioned, commitments made, next steps discussed)

Respond in JSON format:
{{
  "relationship_stage": "early|mid|advanced",
  "communication_style": "formal|casual|technical|friendly|brief|detailed",
  "key_topics": ["topic1", "topic2", ...],
  "pain_points": ["pain point 1", "pain point 2", ...],
  "interests": ["interest 1", "interest 2", ...],
  "objections": ["objection 1", ...] or [],
  "sentiment_trend": "positive|neutral|negative|mixed",
  "last_interaction_tone": "positive|neutral|negative|questioning|interested",
  "specific_details": ["detail 1", "detail 2", ...]
}}"""

        try:
            result_text = self._call_claude(
                system="You are an expert at analyzing sales conversations and extracting key insights. Respond only with valid JSON.",
                user_prompt=analysis_prompt,
                temperature=0.3,
                max_tokens=1000,
                json_mode=True
            )

            analysis = self._parse_json_response(result_text)

            return {
                "relationship_stage": analysis.get("relationship_stage", "mid"),
                "communication_style": analysis.get("communication_style", "neutral"),
                "key_topics": analysis.get("key_topics", []),
                "pain_points": analysis.get("pain_points", []),
                "interests": analysis.get("interests", []),
                "objections": analysis.get("objections", []),
                "sentiment_trend": analysis.get("sentiment_trend", "neutral"),
                "last_interaction_tone": analysis.get("last_interaction_tone", "neutral"),
                "specific_details": analysis.get("specific_details", [])
            }
        except Exception as e:
            logger.warning(f"Error analyzing conversation context: {str(e)}. Using fallback analysis.")
            return self._basic_conversation_analysis(conversations)

    def _basic_conversation_analysis(self, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback basic analysis if AI analysis fails. Extracts info from meeting notes if available."""
        if not conversations:
            return {
                "relationship_stage": "early",
                "communication_style": "neutral",
                "key_topics": [],
                "pain_points": [],
                "interests": [],
                "objections": [],
                "sentiment_trend": "neutral",
                "last_interaction_tone": "neutral",
                "specific_details": []
            }

        real_messages = [c for c in conversations if c.get("direction") not in ("context",) and c.get("type") != "meeting_notes"]
        meeting_notes = [c for c in conversations if c.get("type") == "meeting_notes" or c.get("direction") == "context"]

        message_count = len(real_messages)
        relationship_stage = "early" if message_count < 5 else "mid" if message_count < 15 else "advanced"

        # If we have meeting notes, it means there was a call — upgrade relationship stage
        if meeting_notes and relationship_stage == "early":
            relationship_stage = "mid"

        last_msg = real_messages[0] if real_messages else {}
        last_content = last_msg.get("content", "").lower()

        positive_words = ["interested", "great", "yes", "sounds good", "excited", "love", "perfect"]
        negative_words = ["not interested", "no", "busy", "later", "maybe", "concerned", "worried"]

        sentiment = "neutral"
        if any(word in last_content for word in positive_words):
            sentiment = "positive"
        elif any(word in last_content for word in negative_words):
            sentiment = "negative"

        # Extract key topics from meeting notes
        specific_details = []
        key_topics = []
        for note in meeting_notes:
            content = note.get("content", "")
            if "Key Topics:" in content:
                topics_line = content.split("Key Topics:")[1].split("\n")[0]
                key_topics = [t.strip() for t in topics_line.split(",") if t.strip()]
            if "Summary:" in content:
                summary = content.split("Summary:")[1].split("\n")[0].strip()
                if summary:
                    specific_details.append(summary[:200])

        return {
            "relationship_stage": relationship_stage,
            "communication_style": "neutral",
            "key_topics": key_topics,
            "pain_points": [],
            "interests": [],
            "objections": [],
            "sentiment_trend": sentiment,
            "last_interaction_tone": sentiment,
            "specific_details": specific_details
        }

    def _split_long_message(self, message: str, max_length: int) -> List[str]:
        """Split a long message into multiple shorter messages at natural break points."""
        import re

        sentences = re.split(r'([.!?]\s+)', message)

        reconstructed = []
        for i in range(0, len(sentences), 2):
            if i + 1 < len(sentences):
                reconstructed.append(sentences[i] + sentences[i + 1])
            else:
                reconstructed.append(sentences[i])

        messages = []
        current_message = ""

        for sentence in reconstructed:
            sentence = sentence.strip()
            if not sentence:
                continue

            if current_message and len(current_message) + len(sentence) + 1 > max_length:
                if current_message:
                    messages.append(current_message.strip())
                current_message = sentence
            else:
                if current_message:
                    current_message += " " + sentence
                else:
                    current_message = sentence

        if current_message:
            messages.append(current_message.strip())

        if len(messages) == 1 and len(messages[0]) > max_length:
            messages = []
            parts = re.split(r'(,\s+)', message)
            reconstructed = []
            for i in range(0, len(parts), 2):
                if i + 1 < len(parts):
                    reconstructed.append(parts[i] + parts[i + 1])
                else:
                    reconstructed.append(parts[i])

            current_message = ""
            for part in reconstructed:
                part = part.strip()
                if not part:
                    continue

                if current_message and len(current_message) + len(part) + 1 > max_length:
                    if current_message:
                        messages.append(current_message.strip())
                    current_message = part
                else:
                    if current_message:
                        current_message += " " + part
                    else:
                        current_message = part

            if current_message:
                messages.append(current_message.strip())

        if len(messages) == 1 and len(messages[0]) > max_length:
            messages = []
            words = message.split()
            current_message = ""

            for word in words:
                if current_message and len(current_message) + len(word) + 1 > max_length:
                    if current_message:
                        messages.append(current_message.strip())
                    current_message = word
                else:
                    if current_message:
                        current_message += " " + word
                    else:
                        current_message = word

            if current_message:
                messages.append(current_message.strip())

        final_messages = []
        for msg in messages:
            if len(msg) > max_length:
                msg = msg[:max_length-3] + "..."
            if len(msg) >= 20:
                final_messages.append(msg)

        return final_messages if len(final_messages) >= 2 else []

    def _add_line_breaks(self, message: str, max_length: int) -> str:
        """Add line breaks to a long message at natural points for better readability."""
        import re

        if '\n' in message:
            return message

        sentences = re.split(r'([.!?]\s+)', message)
        reconstructed = []
        for i in range(0, len(sentences), 2):
            if i + 1 < len(sentences):
                reconstructed.append(sentences[i] + sentences[i + 1])
            else:
                reconstructed.append(sentences[i])

        lines = []
        current_line = ""

        for sentence in reconstructed:
            sentence = sentence.strip()
            if not sentence:
                continue

            if current_line and len(current_line) + len(sentence) + 1 > max_length:
                if current_line:
                    lines.append(current_line.strip())
                current_line = sentence
            else:
                if current_line:
                    current_line += " " + sentence
                else:
                    current_line = sentence

        if current_line:
            lines.append(current_line.strip())

        if len(lines) == 1 and len(lines[0]) > max_length:
            parts = re.split(r'(,\s+)', message)
            reconstructed = []
            for i in range(0, len(parts), 2):
                if i + 1 < len(parts):
                    reconstructed.append(parts[i] + parts[i + 1])
                else:
                    reconstructed.append(parts[i])

            lines = []
            current_line = ""

            for part in reconstructed:
                part = part.strip()
                if not part:
                    continue

                if current_line and len(current_line) + len(part) + 1 > max_length:
                    if current_line:
                        lines.append(current_line.strip())
                    current_line = part
                else:
                    if current_line:
                        current_line += " " + part
                    else:
                        current_line = part

            if current_line:
                lines.append(current_line.strip())

        return '\n'.join(lines)

    def _generate_fallback_message(self, deal_title: str, days_since_activity: int) -> str:
        """Generate a simple fallback message if AI fails."""
        return f"Hi! Wanted to follow up on {deal_title}. It's been a while since we last connected. Are you still interested in moving forward? Happy to answer any questions!"

    def generate_reactivation_email(
        self,
        deal_title: str,
        deal_value: Optional[float],
        deal_status: str,
        days_since_activity: int,
        conversations: List[Dict[str, Any]],
        feedback: Optional[str] = None,
        previous_message: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate a reactivation email for a stalled deal.
        Returns dict with 'subject' and 'body' (with proper paragraphs/line breaks).
        """
        context_analysis = self._analyze_conversation_context(conversations)
        conversation_text = self._format_conversations(conversations)
        value_str = f"${deal_value:,.2f}" if deal_value else "Not specified"

        system_prompt = f"""You are an expert sales representative writing a personalized reactivation email for a stalled deal. You deeply understand this prospect from their conversation history and meeting notes.

CONTEXT ANALYSIS:
- Relationship Stage: {context_analysis['relationship_stage']}
- Communication Style: {context_analysis['communication_style']}
- Key Topics: {', '.join(context_analysis['key_topics'][:5]) if context_analysis['key_topics'] else 'None identified'}
- Pain Points: {', '.join(context_analysis['pain_points'][:3]) if context_analysis['pain_points'] else 'None identified'}
- Interests: {', '.join(context_analysis['interests'][:3]) if context_analysis['interests'] else 'None identified'}
- Sentiment: {context_analysis['sentiment_trend']}
- Last Interaction Tone: {context_analysis['last_interaction_tone']}
- Specific Details: {', '.join(context_analysis['specific_details'][:3]) if context_analysis['specific_details'] else 'None'}

EMAIL WRITING RULES:
1. Write a proper professional email with clear paragraphs separated by blank lines
2. Use 3-5 short paragraphs (2-3 sentences each)
3. Structure: greeting → context/callback → value proposition → soft CTA → sign-off
4. Reference SPECIFIC details from their conversations or meetings — names, topics, numbers, dates
5. NEVER write a generic "checking in" email — always add value
6. Match the prospect's communication style ({context_analysis['communication_style']})
7. Keep paragraphs SHORT — no walls of text
8. Use a warm but professional tone
9. Include a clear but low-pressure call to action
10. The email must feel like it was written by a human who remembers the conversation, NOT a template"""

        if feedback and previous_message:
            user_prompt = f"""Rewrite this reactivation email based on user feedback:

DEAL: {deal_title} | Value: {value_str} | Inactive: {days_since_activity} days

CONVERSATION HISTORY:
{conversation_text}

PREVIOUS EMAIL:
{previous_message}

FEEDBACK: {feedback}

Generate a JSON response with:
{{"subject": "Email subject line (short, specific, no generic phrases)", "body": "Full email body with proper paragraphs separated by \\n\\n"}}"""
        else:
            user_prompt = f"""Write a reactivation email for this stalled deal:

DEAL: {deal_title} | Value: {value_str} | Status: {deal_status} | Inactive: {days_since_activity} days

CONVERSATION HISTORY:
{conversation_text}

INSTRUCTIONS:
- Subject line: Short, specific, references something from their conversation (NOT generic like "Following up" or "Checking in")
- Body: 3-5 short paragraphs with blank lines between them
- Opening: Personal greeting + specific callback to their last conversation/meeting
- Middle: Add value — share an insight, update, or resource relevant to their pain points/interests
- Close: Soft CTA (e.g., "Would it make sense to reconnect?" or "Happy to share more if useful")
- Sign-off: Professional but warm

Generate a JSON response with:
{{"subject": "Email subject line", "body": "Full email body with paragraphs separated by \\n\\n"}}"""

        try:
            result_text = self._call_claude(
                system=system_prompt,
                user_prompt=user_prompt,
                temperature=0.7,
                max_tokens=1000,
                json_mode=True
            )
            result = self._parse_json_response(result_text)
            subject = result.get("subject", f"Following up on {deal_title}")
            body = result.get("body", "")

            # Ensure body has proper line breaks
            if body and "\n\n" not in body:
                # Try to add paragraph breaks at sentence boundaries
                import re
                sentences = re.split(r'(?<=[.!?])\s+', body)
                if len(sentences) >= 4:
                    # Group sentences into paragraphs of ~2-3 sentences
                    paragraphs = []
                    current = []
                    for i, s in enumerate(sentences):
                        current.append(s)
                        if len(current) >= 2 and i < len(sentences) - 1:
                            paragraphs.append(" ".join(current))
                            current = []
                    if current:
                        paragraphs.append(" ".join(current))
                    body = "\n\n".join(paragraphs)

            return {"subject": subject, "body": body}

        except Exception as e:
            logger.error(f"Error generating email: {e}", exc_info=True)
            return {
                "subject": f"Following up on {deal_title}",
                "body": f"Hi,\n\nI wanted to reach out regarding {deal_title}. It's been a little while since we last connected, and I'd love to pick up where we left off.\n\nWould it make sense to reconnect this week?\n\nBest regards"
            }

    def process_knowledge_base_chat(
        self,
        message: str,
        conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process a chat message to update the knowledge base."""
        history_text = ""
        if conversation_history:
            history_text = "\n".join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                for msg in conversation_history[-5:]
            ])

        system_prompt = """You are an AI assistant helping users update their knowledge base for a sales/CRM system called Revive.ai.

Your role:
1. Understand what information the user wants to add
2. Determine if it should be saved as a document (FAQ, Sales Script, Product Info, etc.)
3. If yes, create structured, well-formatted content in markdown
4. Respond conversationally and helpfully

Document types you can create:
- FAQ: Frequently asked questions with answers
- Sales Script: Sales conversation scripts and talking points
- Product Info: Product descriptions, features, and benefits
- Pricing Guide: Pricing information, tiers, and packages
- Objection Handling: Common objections and how to respond
- Company Info: Company information, values, and tone guides

Guidelines:
- Always create well-structured markdown content
- Use clear headings and formatting
- Make content actionable and useful for sales teams
- If the user's intent is unclear, ask clarifying questions (set should_create_document to false)
- If the user wants to add information, create a document (set should_create_document to true)

Format your response as JSON with:
{
  "response": "Your friendly response message explaining what you've done",
  "should_create_document": true/false,
  "document_title": "Clear, descriptive title for the document",
  "document_content": "Full markdown content with proper structure",
  "document_type": "FAQ" | "Sales Script" | "Product Info" | "Pricing Guide" | "Objection Handling" | "Company Info" | "Other"
}"""

        user_prompt = f"""User message: {message}

{history_text if history_text else "No previous conversation history."}

Process this message and determine if a knowledge base document should be created.
If the user wants to add, create, save, or update information, create a document.
If the user is just asking questions or the intent is unclear, ask for clarification (set should_create_document to false).

If creating a document:
- Create well-structured markdown content
- Use appropriate headings (## for sections, ### for subsections)
- Make it useful for sales teams
- Include relevant details from the user's message
- Format it professionally

Respond with JSON only."""

        try:
            result_text = self._call_claude(
                system=system_prompt,
                user_prompt=user_prompt,
                temperature=0.7,
                max_tokens=2000,
                json_mode=True
            )

            result = self._parse_json_response(result_text)

            return {
                "response": result.get("response", "I've processed your message."),
                "should_create_document": result.get("should_create_document", False),
                "document_title": result.get("document_title", "Untitled Document"),
                "document_content": result.get("document_content", ""),
                "document_type": result.get("document_type", "Other"),
                "document_id": None
            }

        except Exception as e:
            logger.error(f"Error processing knowledge base chat: {str(e)}", exc_info=True)
            return {
                "response": "I understand you want to update the knowledge base. Could you provide more details about what information you'd like to add?",
                "should_create_document": False,
                "document_title": None,
                "document_content": None,
                "document_type": None,
                "document_id": None
            }
