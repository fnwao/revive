"""Background task definitions."""
from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.user import User
from app.services.ghl import get_ghl_service
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="process_deal_update")
def process_deal_update(deal_id: str, event_data: dict, user_id: str = None):
    """
    Process deal update from webhook.
    
    This task:
    1. Fetches full deal data from GHL
    2. Syncs deal to local database
    3. Checks if deal is stalled
    4. If stalled, triggers message generation
    """
    db = SessionLocal()
    try:
        logger.info(f"Processing deal update: {deal_id}")
        
        # TODO: Get user_id from deal or event_data
        # For now, placeholder
        if not user_id:
            logger.warning("No user_id provided, skipping")
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User not found: {user_id}")
            return
        
        # Initialize GHL service (uses mock if configured)
        ghl_service = get_ghl_service(user)
        
        # Fetch deal from GHL
        # Note: This is sync for now, will be async in production
        import asyncio
        ghl_deal_data = asyncio.run(ghl_service.get_deal(deal_id))
        
        if not ghl_deal_data:
            logger.error(f"Failed to fetch deal from GHL: {deal_id}")
            return
        
        # Sync to database
        deal = ghl_service.sync_deal_to_db(db, ghl_deal_data)
        logger.info(f"Synced deal to DB: {deal.id}")
        
        # TODO: Check if deal is stalled
        # TODO: If stalled, trigger message generation
        
    except Exception as e:
        logger.error(f"Error processing deal update: {str(e)}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="generate_reactivation_message")
def generate_reactivation_message(deal_id: str, user_id: str):
    """
    Generate AI-powered reactivation message for a stalled deal.
    
    This task:
    1. Fetches conversation history
    2. Calls OpenAI to generate message
    3. Stores in approval queue
    """
    db = SessionLocal()
    try:
        logger.info(f"Generating reactivation message for deal: {deal_id}")
        
        # TODO: Implement message generation
        # 1. Fetch deal and conversations
        # 2. Call OpenAI API
        # 3. Store in approval_queue table
        
        logger.info("Message generation task - TODO: implement")
        
    except Exception as e:
        logger.error(f"Error generating message: {str(e)}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="sync_conversations")
def sync_conversations(deal_id: str, user_id: str):
    """
    Sync conversation history from GHL to local database.
    
    This task:
    1. Fetches messages from GHL
    2. Stores in conversations table
    3. Updates deal's last_contact_date
    """
    db = SessionLocal()
    try:
        logger.info(f"Syncing conversations for deal: {deal_id}")
        
        # TODO: Implement conversation syncing
        # 1. Get user and deal
        # 2. Fetch conversations from GHL
        # 3. Store in conversations table
        
        logger.info("Conversation sync task - TODO: implement")
        
    except Exception as e:
        logger.error(f"Error syncing conversations: {str(e)}", exc_info=True)
    finally:
        db.close()

