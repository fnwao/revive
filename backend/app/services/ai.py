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
        max_length: int = 160
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
        
        Returns:
            Generated message text
        """
        # Format conversation history
        conversation_text = self._format_conversations(conversations)
        
        # Build system prompt
        system_prompt = """You are a professional sales representative reactivating a stalled deal. 
Your goal is to re-engage the prospect in a natural, consultative way.

Guidelines:
- Be conversational and friendly, not pushy
- Reference prior conversation naturally
- Create gentle urgency without being aggressive
- Keep it short and personal (SMS format)
- Focus on value and next steps
- Match the tone of prior messages"""
        
        # Build user prompt with context
        value_str = f"${deal_value:,.2f}" if deal_value else "Not specified"
        user_prompt = f"""Generate a reactivation SMS message for this stalled deal:

Deal Context:
- Title: {deal_title}
- Value: {value_str}
- Status: {deal_status}
- Last Activity: {days_since_activity} days ago

Recent Conversation History (most recent first):
{conversation_text}

Generate a short, professional SMS message (max {max_length} characters) to reactivate this deal. 
Reference the prior conversation naturally and create a reason to reconnect."""
        
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

