"""Deal detection service."""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.services.ghl import get_ghl_service
from app.models.user import User
from app.db.session import SessionLocal
from app.models.deal import Deal
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


async def detect_stalled_deals(
    user: User,
    pipeline_id: str = None,
    deal_ids: List[str] = None,
    threshold_days: int = 7,
    status_filter: List[str] = None,
    tags_filter: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Detect stalled deals based on last activity date.
    
    Args:
        user: User to fetch deals for
        pipeline_id: Optional pipeline ID to check all deals in pipeline
        deal_ids: Optional list of specific deal IDs to check
        threshold_days: Days of inactivity to consider stalled (default: 7)
    
    Returns:
        List of stalled deal dictionaries
    """
    ghl_service = get_ghl_service(user)
    stalled_deals = []
    threshold_date = datetime.now() - timedelta(days=threshold_days)
    
    # Get deals to check
    deals_to_check = []
    
    # First, try to get deals from database (for mock/test data)
    db = SessionLocal()
    try:
        db_deals = []
        if deal_ids:
            # Get specific deals from database
            for deal_id in deal_ids:
                db_deal = db.query(Deal).filter(
                    and_(
                        Deal.user_id == user.id,
                        Deal.ghl_deal_id == deal_id
                    )
                ).first()
                if db_deal:
                    db_deals.append(db_deal)
        elif pipeline_id:
            # Get all deals in pipeline from database
            db_deals = db.query(Deal).filter(
                and_(
                    Deal.user_id == user.id,
                    Deal.ghl_pipeline_id == pipeline_id
                )
            ).all()
        
        # Convert database deals to dict format
        for db_deal in db_deals:
            # Apply status filter if provided
            if status_filter and db_deal.status not in status_filter:
                continue
            
            # Apply tags filter if provided
            if tags_filter:
                deal_tags = db_deal.tags if db_deal.tags else []
                if not isinstance(deal_tags, list):
                    deal_tags = []
                # Check if deal has at least one of the required tags
                if not any(tag in deal_tags for tag in tags_filter):
                    continue
            
            deals_to_check.append({
                "id": db_deal.ghl_deal_id,
                "dealId": db_deal.ghl_deal_id,
                "title": db_deal.title,
                "status": db_deal.status,
                "monetaryValue": float(db_deal.value) if db_deal.value else None,
                "contactId": db_deal.ghl_contact_id,
                "pipelineId": db_deal.ghl_pipeline_id,
                "lastActivityDate": db_deal.last_activity_date.isoformat() if db_deal.last_activity_date else None,
                "tags": db_deal.tags if db_deal.tags else [],
            })
        
        if db_deals:
            logger.info(f"Found {len(db_deals)} deals in database")
    except Exception as e:
        logger.error(f"Error querying database for deals: {e}")
    finally:
        db.close()
    
    # If no database deals found, try GHL service
    if not deals_to_check:
        if deal_ids:
            # Check specific deals
            logger.info(f"Checking {len(deal_ids)} specific deals from GHL")
            for deal_id in deal_ids:
                deal = await ghl_service.get_deal(deal_id)
                if deal:
                    deals_to_check.append(deal)
                else:
                    logger.warning(f"Deal not found: {deal_id}")
        
        elif pipeline_id:
            # Check all deals in pipeline
            logger.info(f"Checking all deals in pipeline: {pipeline_id} from GHL")
            deals_to_check = await ghl_service.get_deals_by_pipeline(pipeline_id)
        
        else:
            logger.error("Either pipeline_id or deal_ids must be provided")
            return []
    
    # Check each deal for stalled status
    for deal in deals_to_check:
        # Apply status filter if provided (for GHL deals)
        if status_filter and deal.get("status") not in status_filter:
            continue
        
        # Apply tags filter if provided (for GHL deals)
        if tags_filter:
            deal_tags = deal.get("tags", [])
            if not isinstance(deal_tags, list):
                deal_tags = []
            # Check if deal has at least one of the required tags
            if not any(tag in deal_tags for tag in tags_filter):
                continue
        
        last_activity_str = deal.get("lastActivityDate")
        last_activity = None
        
        if last_activity_str:
            # Parse last activity date
            try:
                # Handle ISO format with Z
                if isinstance(last_activity_str, str):
                    if last_activity_str.endswith("Z"):
                        last_activity_str = last_activity_str.replace("Z", "+00:00")
                    last_activity = datetime.fromisoformat(last_activity_str)
                elif isinstance(last_activity_str, datetime):
                    last_activity = last_activity_str
            except Exception as e:
                logger.error(f"Error parsing date for deal {deal.get('id')}: {e}")
                continue
        
        if not last_activity:
            # No activity date - consider it stalled
            logger.warning(f"Deal {deal.get('id')} has no lastActivityDate - considering stalled")
            stalled_deals.append({
                "deal_id": deal.get("id") or deal.get("dealId"),
                "title": deal.get("title"),
                "status": deal.get("status"),
                "value": deal.get("monetaryValue"),
                "currency": "USD",
                "last_activity_date": None,
                "days_since_activity": 999,  # High number to indicate no activity
                "contact_id": deal.get("contactId"),
                "pipeline_id": deal.get("pipelineId"),
                "tags": deal.get("tags", []),
            })
            continue
        
        # Check if stalled
        # Make both datetimes timezone-naive for comparison
        last_activity_naive = last_activity.replace(tzinfo=None) if last_activity.tzinfo else last_activity
        threshold_naive = threshold_date.replace(tzinfo=None) if threshold_date.tzinfo else threshold_date
        
        if last_activity_naive < threshold_naive:
            days_since = (datetime.now() - last_activity_naive).days
            
            stalled_deals.append({
                "deal_id": deal.get("id") or deal.get("dealId"),
                "title": deal.get("title"),
                "status": deal.get("status"),
                "value": deal.get("monetaryValue"),
                "currency": "USD",
                "last_activity_date": last_activity,
                "days_since_activity": days_since,
                "contact_id": deal.get("contactId"),
                "pipeline_id": deal.get("pipelineId"),
                "tags": deal.get("tags", []),
            })
            
            logger.info(
                f"Found stalled deal: {deal.get('id')} "
                f"(inactive for {days_since} days)"
            )
    
    logger.info(f"Found {len(stalled_deals)} stalled deals out of {len(deals_to_check)} checked")
    return stalled_deals

