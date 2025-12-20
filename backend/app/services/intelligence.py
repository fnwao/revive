"""Intelligence service for smart deal analysis and recommendations."""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from app.services.ai import AIService
import logging
import math

logger = logging.getLogger(__name__)


class IntelligenceService:
    """Service for intelligent deal analysis and recommendations."""
    
    def __init__(self):
        """Initialize intelligence service."""
        self.ai_service = AIService()
    
    def calculate_deal_score(
        self,
        deal_value: Optional[float],
        days_since_activity: int,
        conversation_count: int,
        last_message_sentiment: Optional[str] = None,
        deal_stage: str = "active"
    ) -> Dict[str, Any]:
        """
        Calculate intelligent deal score based on multiple factors.
        
        Args:
            deal_value: Deal value in dollars
            days_since_activity: Days since last activity
            conversation_count: Number of messages in conversation
            last_message_sentiment: Sentiment of last message (positive/neutral/negative)
            deal_stage: Current deal stage/status
        
        Returns:
            Dictionary with score, priority, and insights
        """
        score = 0.0
        factors = {}
        
        # Factor 1: Deal Value (0-40 points)
        if deal_value:
            if deal_value >= 50000:
                value_score = 40
            elif deal_value >= 25000:
                value_score = 30
            elif deal_value >= 10000:
                value_score = 20
            elif deal_value >= 5000:
                value_score = 15
            else:
                value_score = 10
            score += value_score
            factors["value"] = {"score": value_score, "weight": "high"}
        else:
            factors["value"] = {"score": 0, "weight": "unknown"}
        
        # Factor 2: Urgency (0-30 points)
        # More days = higher urgency, but with diminishing returns
        if days_since_activity <= 7:
            urgency_score = 10
        elif days_since_activity <= 14:
            urgency_score = 20
        elif days_since_activity <= 30:
            urgency_score = 25
        elif days_since_activity <= 60:
            urgency_score = 28
        else:
            urgency_score = 30
        score += urgency_score
        factors["urgency"] = {"score": urgency_score, "weight": "high"}
        
        # Factor 3: Engagement Level (0-20 points)
        # More conversations = better engagement
        if conversation_count >= 10:
            engagement_score = 20
        elif conversation_count >= 5:
            engagement_score = 15
        elif conversation_count >= 2:
            engagement_score = 10
        else:
            engagement_score = 5
        score += engagement_score
        factors["engagement"] = {"score": engagement_score, "weight": "medium"}
        
        # Factor 4: Sentiment (0-10 points)
        if last_message_sentiment:
            if last_message_sentiment == "positive":
                sentiment_score = 10
            elif last_message_sentiment == "neutral":
                sentiment_score = 5
            else:  # negative
                sentiment_score = 2
            score += sentiment_score
            factors["sentiment"] = {"score": sentiment_score, "weight": "medium"}
        else:
            factors["sentiment"] = {"score": 0, "weight": "unknown"}
        
        # Normalize score to 0-100
        max_possible_score = 100
        normalized_score = min(score, max_possible_score)
        
        # Determine priority level
        if normalized_score >= 80:
            priority = "critical"
        elif normalized_score >= 60:
            priority = "high"
        elif normalized_score >= 40:
            priority = "medium"
        else:
            priority = "low"
        
        # Generate insights
        insights = self._generate_deal_insights(
            deal_value, days_since_activity, conversation_count, 
            last_message_sentiment, deal_stage, normalized_score
        )
        
        return {
            "score": round(normalized_score, 1),
            "priority": priority,
            "factors": factors,
            "insights": insights,
            "recommended_action": self._recommend_action(normalized_score, days_since_activity, deal_value)
        }
    
    def _generate_deal_insights(
        self,
        deal_value: Optional[float],
        days_since_activity: int,
        conversation_count: int,
        last_message_sentiment: Optional[str],
        deal_stage: str,
        score: float
    ) -> List[str]:
        """Generate intelligent insights about the deal."""
        insights = []
        
        if deal_value and deal_value >= 25000:
            insights.append(f"High-value deal (${deal_value:,.0f}) - significant revenue potential")
        
        if days_since_activity > 30:
            insights.append(f"Deal has been inactive for {days_since_activity} days - urgent attention needed")
        elif days_since_activity > 14:
            insights.append(f"Deal inactive for {days_since_activity} days - risk of losing momentum")
        
        if conversation_count == 0:
            insights.append("No prior conversation history - initial outreach needed")
        elif conversation_count < 3:
            insights.append("Limited conversation history - build relationship")
        elif conversation_count >= 5:
            insights.append("Strong engagement history - good foundation for reactivation")
        
        if last_message_sentiment == "positive":
            insights.append("Last interaction was positive - good opportunity to re-engage")
        elif last_message_sentiment == "negative":
            insights.append("Last interaction was negative - may need careful approach")
        
        if deal_stage in ["won", "closed"]:
            insights.append("Deal appears to be in final stages - high conversion potential")
        
        if score >= 80:
            insights.append("High priority deal - immediate action recommended")
        
        return insights
    
    def _recommend_action(
        self,
        score: float,
        days_since_activity: int,
        deal_value: Optional[float]
    ) -> str:
        """Recommend action based on deal characteristics."""
        if score >= 80:
            return "Send personalized reactivation message immediately"
        elif days_since_activity > 30:
            return "Urgent: Deal at risk - send message with value proposition"
        elif deal_value and deal_value >= 25000:
            return "High-value deal - craft personalized message with specific value points"
        elif days_since_activity > 14:
            return "Send gentle check-in message to re-engage"
        else:
            return "Send friendly follow-up message"
    
    def predict_response_probability(
        self,
        days_since_activity: int,
        conversation_count: int,
        last_message_sentiment: Optional[str],
        deal_value: Optional[float]
    ) -> Dict[str, Any]:
        """
        Predict probability of getting a response.
        
        Returns:
            Dictionary with probability, confidence, and factors
        """
        base_probability = 0.5  # 50% base
        
        # Adjust based on days since activity
        if days_since_activity <= 7:
            time_factor = 0.2  # +20%
        elif days_since_activity <= 14:
            time_factor = 0.1  # +10%
        elif days_since_activity <= 30:
            time_factor = 0.0  # No change
        elif days_since_activity <= 60:
            time_factor = -0.1  # -10%
        else:
            time_factor = -0.2  # -20%
        
        # Adjust based on engagement
        if conversation_count >= 10:
            engagement_factor = 0.15  # +15%
        elif conversation_count >= 5:
            engagement_factor = 0.1  # +10%
        elif conversation_count >= 2:
            engagement_factor = 0.05  # +5%
        else:
            engagement_factor = -0.1  # -10%
        
        # Adjust based on sentiment
        if last_message_sentiment == "positive":
            sentiment_factor = 0.15  # +15%
        elif last_message_sentiment == "neutral":
            sentiment_factor = 0.0
        elif last_message_sentiment == "negative":
            sentiment_factor = -0.1  # -10%
        else:
            sentiment_factor = 0.0
        
        # Adjust based on value (higher value = more likely to respond)
        if deal_value and deal_value >= 25000:
            value_factor = 0.1  # +10%
        elif deal_value and deal_value >= 10000:
            value_factor = 0.05  # +5%
        else:
            value_factor = 0.0
        
        # Calculate final probability
        probability = base_probability + time_factor + engagement_factor + sentiment_factor + value_factor
        probability = max(0.1, min(0.9, probability))  # Clamp between 10% and 90%
        
        # Calculate confidence (based on data quality)
        confidence_factors = []
        if conversation_count > 0:
            confidence_factors.append("conversation_history")
        if last_message_sentiment:
            confidence_factors.append("sentiment_analysis")
        if deal_value:
            confidence_factors.append("deal_value")
        
        confidence = min(0.95, 0.5 + len(confidence_factors) * 0.15)
        
        return {
            "probability": round(probability * 100, 1),
            "confidence": round(confidence * 100, 1),
            "factors": {
                "time_factor": round(time_factor * 100, 1),
                "engagement_factor": round(engagement_factor * 100, 1),
                "sentiment_factor": round(sentiment_factor * 100, 1),
                "value_factor": round(value_factor * 100, 1),
            },
            "confidence_factors": confidence_factors
        }
    
    def analyze_conversation_sentiment(
        self,
        conversations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze sentiment of conversation history.
        
        Returns:
            Dictionary with overall sentiment and insights
        """
        if not conversations:
            return {
                "overall_sentiment": "neutral",
                "sentiment_score": 0.0,
                "last_message_sentiment": None,
                "insights": ["No conversation history available"]
            }
        
        # Simple sentiment analysis based on keywords
        # In production, would use proper NLP sentiment analysis
        positive_keywords = ["interested", "yes", "great", "thanks", "excited", "love", "perfect", "sounds good"]
        negative_keywords = ["no", "not interested", "busy", "later", "maybe", "don't", "can't", "won't"]
        
        positive_count = 0
        negative_count = 0
        
        for msg in conversations[:10]:  # Analyze last 10 messages
            content = msg.get("content", "").lower()
            if any(keyword in content for keyword in positive_keywords):
                positive_count += 1
            if any(keyword in content for keyword in negative_keywords):
                negative_count += 1
        
        # Determine overall sentiment
        if positive_count > negative_count * 1.5:
            overall_sentiment = "positive"
            sentiment_score = 0.7
        elif negative_count > positive_count * 1.5:
            overall_sentiment = "negative"
            sentiment_score = 0.3
        else:
            overall_sentiment = "neutral"
            sentiment_score = 0.5
        
        # Get last message sentiment
        last_message = conversations[0] if conversations else None
        last_message_sentiment = None
        if last_message:
            content = last_message.get("content", "").lower()
            if any(keyword in content for keyword in positive_keywords):
                last_message_sentiment = "positive"
            elif any(keyword in content for keyword in negative_keywords):
                last_message_sentiment = "negative"
            else:
                last_message_sentiment = "neutral"
        
        insights = []
        if overall_sentiment == "positive":
            insights.append("Conversation history shows positive engagement")
        elif overall_sentiment == "negative":
            insights.append("Conversation history shows some resistance - may need different approach")
        else:
            insights.append("Neutral conversation tone - opportunity to build rapport")
        
        return {
            "overall_sentiment": overall_sentiment,
            "sentiment_score": sentiment_score,
            "last_message_sentiment": last_message_sentiment,
            "insights": insights,
            "message_count": len(conversations)
        }
    
    def suggest_optimal_timing(
        self,
        conversations: List[Dict[str, Any]],
        timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Suggest optimal time to send message based on historical patterns.
        
        Returns:
            Dictionary with suggested time and reasoning
        """
        if not conversations:
            # Default: suggest business hours
            return {
                "suggested_time": "09:00-17:00",
                "reasoning": "No historical data - defaulting to business hours",
                "confidence": "low"
            }
        
        # Analyze message timestamps to find patterns
        # For now, return default business hours suggestion
        # In production, would analyze actual timestamps
        
        return {
            "suggested_time": "09:00-17:00",
            "reasoning": "Best response rates typically during business hours",
            "confidence": "medium"
        }


