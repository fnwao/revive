"""AI service for message generation using OpenAI."""
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered message generation."""
    
    def __init__(self):
        """Initialize OpenAI client."""
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4"  # Use GPT-4 for best quality
    
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
        
        Args:
            deal_title: Title/name of the deal
            deal_value: Deal value in dollars
            deal_status: Current deal status
            days_since_activity: Days since last activity
            conversations: List of recent conversation messages
            max_length: Maximum message length per message (default: 160 for SMS)
            feedback: Optional user feedback to incorporate into regeneration
            previous_message: Optional previous message that received feedback
            generate_sequence: If True, generates 3-4 messages; if False, generates single message
        
        Returns:
            List of generated message texts (3-4 messages for natural flow)
        """
        # Deeply analyze conversation context first
        context_analysis = self._analyze_conversation_context(conversations)
        
        # Format conversation history
        conversation_text = self._format_conversations(conversations)
        
        # Build comprehensive system prompt with deep context understanding + sales/copywriting best practices
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
            # Use the same context analysis for regeneration
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
- Sounds natural and human, not templated or salesy"""
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
            
            # Build context summary for prompt
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
                # Generate 3-4 shorter messages for natural conversation flow
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
    "Fourth short message (40-120 chars)" // Optional, only if needed
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
                # Single message generation (for backward compatibility)
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
- Sounds natural and human, not templated or salesy"""
        
        try:
            if generate_sequence and not feedback:
                # Generate message sequence
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,  # Slightly creative but professional
                    max_tokens=600,  # Enough for 3-4 short messages
                    response_format={"type": "json_object"}
                )
                
                import json
                result = json.loads(response.choices[0].message.content.strip())
                messages = result.get("messages", [])
                
                # Validate and clean messages
                if not messages or len(messages) < 2:
                    logger.warning("AI generated fewer than 2 messages, falling back to single message")
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
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,  # Slightly creative but professional
                    max_tokens=200,  # Enough for SMS length
                )
                
                message = response.choices[0].message.content.strip()
                
                # Ensure message is within max length
                if len(message) > max_length:
                    logger.warning(f"Generated message ({len(message)} chars) exceeds max length ({max_length})")
                    message = message[:max_length-3] + "..."
                
                logger.info(f"Generated message ({len(message)} chars): {message[:50]}...")
                return [message]  # Return as list for consistency
            
        except Exception as e:
            logger.error(f"Error generating message with OpenAI: {str(e)}", exc_info=True)
            # Fallback to a simple template message
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
    
    def _format_conversations(self, conversations: List[Dict[str, Any]], limit: int = 20) -> str:
        """Format conversation history for prompt with enhanced context."""
        if not conversations:
            return "No prior conversation history."
        
        # Take most recent conversations (increased limit for better context)
        recent = conversations[:limit]
        
        formatted = []
        for i, msg in enumerate(recent, 1):
            direction = msg.get("direction", "unknown")
            content = msg.get("content", "")
            sent_at = msg.get("sentAt", msg.get("createdAt", ""))
            msg_type = msg.get("type", "message")
            
            # Format timestamp if available
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
            formatted.append(f"{i}. {type_label} [{label}] ({timestamp}): {content}".strip())
        
        return "\n".join(formatted)
    
    def _analyze_conversation_context(self, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Deeply analyze conversation history to extract key insights about the lead.
        
        Returns a dictionary with:
        - relationship_stage: early, mid, advanced
        - communication_style: formal, casual, technical, friendly
        - key_topics: list of main topics discussed
        - pain_points: identified pain points or concerns
        - interests: what the prospect is interested in
        - objections: any objections raised
        - sentiment_trend: positive, neutral, negative, mixed
        - last_interaction_tone: tone of the last message
        - specific_details: important specific details to reference
        """
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
        
        # Analyze conversations using AI for deep understanding
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
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing sales conversations and extracting key insights. Respond only with valid JSON."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent analysis
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            import json
            analysis = json.loads(response.choices[0].message.content.strip())
            
            # Ensure all fields exist with defaults
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
            # Fallback: basic analysis from conversation text
            return self._basic_conversation_analysis(conversations)
    
    def _basic_conversation_analysis(self, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback basic analysis if AI analysis fails."""
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
        
        # Basic heuristics
        message_count = len(conversations)
        relationship_stage = "early" if message_count < 5 else "mid" if message_count < 15 else "advanced"
        
        # Check last message direction
        last_msg = conversations[0] if conversations else {}
        last_direction = last_msg.get("direction", "unknown")
        last_content = last_msg.get("content", "").lower()
        
        # Simple sentiment detection
        positive_words = ["interested", "great", "yes", "sounds good", "excited", "love", "perfect"]
        negative_words = ["not interested", "no", "busy", "later", "maybe", "concerned", "worried"]
        
        sentiment = "neutral"
        if any(word in last_content for word in positive_words):
            sentiment = "positive"
        elif any(word in last_content for word in negative_words):
            sentiment = "negative"
        
        return {
            "relationship_stage": relationship_stage,
            "communication_style": "neutral",
            "key_topics": [],
            "pain_points": [],
            "interests": [],
            "objections": [],
            "sentiment_trend": sentiment,
            "last_interaction_tone": sentiment,
            "specific_details": []
        }
    
    def _generate_fallback_message(self, deal_title: str, days_since_activity: int) -> str:
        """Generate a simple fallback message if AI fails."""
        return f"Hi! Wanted to follow up on {deal_title}. It's been a while since we last connected. Are you still interested in moving forward? Happy to answer any questions!"
    
    def process_knowledge_base_chat(
        self,
        message: str,
        conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Process a chat message to update the knowledge base.
        
        Args:
            message: User's chat message
            conversation_history: Previous messages in the conversation
        
        Returns:
            Dictionary with:
            - response: AI's response message
            - should_create_document: Whether to create a document
            - document_title: Title for the document (if creating)
            - document_content: Content for the document (if creating)
            - document_type: Type of document (FAQ, Sales Script, etc.)
            - document_id: ID of created document (if any)
        """
        # Format conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n".join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                for msg in conversation_history[-5:]  # Last 5 messages for context
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
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            
            # Ensure all required fields
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
            # Fallback response
            return {
                "response": "I understand you want to update the knowledge base. Could you provide more details about what information you'd like to add?",
                "should_create_document": False,
                "document_title": None,
                "document_content": None,
                "document_type": None,
                "document_id": None
            }

