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
        previous_message: Optional[str] = None
    ) -> str:
        """
        Generate a reactivation message for a stalled deal.
        
        Args:
            deal_title: Title/name of the deal
            deal_value: Deal value in dollars
            deal_status: Current deal status
            days_since_activity: Days since last activity
            conversations: List of recent conversation messages
            max_length: Maximum message length (default: 160 for SMS)
            feedback: Optional user feedback to incorporate into regeneration
            previous_message: Optional previous message that received feedback
        
        Returns:
            Generated message text
        """
        # Format conversation history
        conversation_text = self._format_conversations(conversations)
        
        # Build system prompt with intelligence
        system_prompt = """You are an intelligent sales representative reactivating a stalled deal. 
Your goal is to re-engage the prospect in a natural, consultative way using context-aware messaging.

Guidelines:
- Be conversational and friendly, not pushy
- Reference prior conversation naturally and specifically
- Create gentle urgency without being aggressive
- Keep it short and personal (SMS format, max 160 characters)
- Focus on value and next steps
- Match the tone of prior messages
- Use deal context (value, stage, history) to personalize
- If deal value is high, emphasize ROI and value proposition
- If conversation history is positive, reference that warmth
- If deal has been inactive long, acknowledge the gap naturally
- Adapt message style based on relationship stage"""
        
        # Build user prompt with context
        value_str = f"${deal_value:,.2f}" if deal_value else "Not specified"
        
        # If feedback is provided, this is a regeneration request
        if feedback and previous_message:
            user_prompt = f"""Regenerate a reactivation SMS message for this stalled deal based on user feedback:

Deal Context:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago

Recent Conversation History (most recent first):
{conversation_text}

Previous Message (that received feedback):
"{previous_message}"

User Feedback:
"{feedback}"

Please regenerate the message incorporating the user's feedback. Generate a short, professional SMS message (max {max_length} characters) that addresses the feedback while maintaining a natural, consultative tone. Reference the prior conversation naturally and create a reason to reconnect."""
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
            
            user_prompt = f"""Generate an intelligent, context-aware reactivation SMS message for this stalled deal:

Deal Context:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago
{value_context}
{urgency_context}

Recent Conversation History (most recent first):
{conversation_text}

Intelligent Instructions:
- Analyze the conversation history to understand the relationship and tone
- If the last interaction was positive, reference that warmth
- If deal value is high (${deal_value:,.0f} if specified), emphasize strategic value and ROI
- If deal has been inactive for {days_since_activity} days, acknowledge naturally but focus on moving forward
- Personalize based on specific details from the conversation history
- Create a compelling reason to reconnect that's relevant to this specific deal

Generate a short, professional SMS message (max {max_length} characters) that is:
- Highly personalized to this specific deal and conversation
- Context-aware based on deal value and urgency
- Natural and consultative, not pushy
- References prior conversation in a meaningful way
- Creates a clear value-driven reason to reconnect"""
        
        try:
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
            return message
            
        except Exception as e:
            logger.error(f"Error generating message with OpenAI: {str(e)}", exc_info=True)
            # Fallback to a simple template message
            return self._generate_fallback_message(deal_title, days_since_activity)
    
    def _format_conversations(self, conversations: List[Dict[str, Any]], limit: int = 10) -> str:
        """Format conversation history for prompt."""
        if not conversations:
            return "No prior conversation history."
        
        # Take most recent conversations
        recent = conversations[:limit]
        
        formatted = []
        for i, msg in enumerate(recent, 1):
            direction = msg.get("direction", "unknown")
            content = msg.get("content", "")
            sent_at = msg.get("sentAt", msg.get("createdAt", ""))
            
            # Format timestamp if available
            timestamp = ""
            if sent_at:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
                    timestamp = dt.strftime("%m/%d")
                except:
                    pass
            
            label = "You" if direction == "outbound" else "Them"
            formatted.append(f"{i}. [{label}] {content} {timestamp}".strip())
        
        return "\n".join(formatted)
    
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

