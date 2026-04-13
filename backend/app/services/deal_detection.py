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


def _extract_tags(deal: Dict[str, Any]) -> List[str]:
    """Extract tags from deal data, handling different GHL API formats."""
    tags = deal.get("tags", []) or deal.get("tagIds", [])
    if not tags:
        return []
    
    if not isinstance(tags, list):
        tags = [tags]
    
    # GHL API may return tags as objects with 'id' and 'name', or as strings
    # Extract tag names/ids for consistent handling
    tag_values = []
    for tag in tags:
        if isinstance(tag, dict):
            # Tag object: prefer name, fall back to id
            tag_value = tag.get("name") or tag.get("id")
            if tag_value:
                tag_values.append(tag_value)
        elif isinstance(tag, str):
            tag_values.append(tag)
        else:
            tag_values.append(str(tag))
    
    return tag_values


async def detect_stalled_deals(
    user: User,
    pipeline_id: str = None,
    deal_ids: List[str] = None,
    threshold_days: int = 7,
    status_filter: List[str] = None,
    tags_filter: List[str] = None,
    excluded_statuses: List[str] = None,
    excluded_tags: List[str] = None
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
    stalled_deals = []
    threshold_date = datetime.now() - timedelta(days=threshold_days)
    
    # Get deals to check
    deals_to_check = []
    db = SessionLocal()
    
    # CRITICAL: Refresh user from database to ensure we have latest credentials
    # The user object passed in might be stale from a previous query
    fresh_user = db.query(User).filter(User.id == user.id).first()
    if not fresh_user:
        logger.error(f"User {user.id} not found in database")
        db.close()
        return []
    
    user = fresh_user  # Use fresh user object with latest credentials
    
    # Check if user has GHL credentials - if so, ALWAYS fetch from GHL (not just when DB is empty)
    user_has_ghl_credentials = bool(user.ghl_access_token and user.ghl_location_id)
    
    logger.info(f"Deal detection for user {user.id}: has_ghl_credentials={user_has_ghl_credentials}, "
                f"token_present={bool(user.ghl_access_token)}, location_present={bool(user.ghl_location_id)}")
    
    if user_has_ghl_credentials:
        logger.info(f"GHL credentials: token_length={len(user.ghl_access_token) if user.ghl_access_token else 0}, "
                   f"location_id={user.ghl_location_id}")
    
    # Get GHL service - this will use real service if credentials exist
    ghl_service = get_ghl_service(user)
    
    # If user has GHL credentials, fetch from GHL API (real data)
    # Otherwise, try database first (for mock/test data)
    if user_has_ghl_credentials:
        logger.info("User has GHL credentials - fetching deals from GHL API")
        try:
            if deal_ids:
                # Check specific deals
                logger.info(f"Fetching {len(deal_ids)} specific deals from GHL")
                for deal_id in deal_ids:
                    deal = await ghl_service.get_deal(deal_id)
                    if deal:
                        # Sync deal to database for future reference
                        ghl_service.sync_deal_to_db(db, deal)
                        deals_to_check.append(deal)
                    else:
                        logger.warning(f"Deal not found in GHL: {deal_id}")
            
            elif pipeline_id:
                # Check all deals in pipeline
                logger.info(f"Fetching all deals in pipeline {pipeline_id} from GHL")
                ghl_deals = await ghl_service.get_deals_by_pipeline(pipeline_id)
                for deal in ghl_deals:
                    # Sync each deal to database
                    ghl_service.sync_deal_to_db(db, deal)
                deals_to_check = ghl_deals
            
            else:
                # No pipeline_id or deal_ids - fetch all deals from GHL
                logger.info("Fetching all deals from GHL")
                ghl_deals = await ghl_service.get_deals_by_pipeline()
                for deal in ghl_deals:
                    # Sync each deal to database
                    ghl_service.sync_deal_to_db(db, deal)
                deals_to_check = ghl_deals
                
            logger.info(f"Fetched {len(deals_to_check)} deals from GHL API")
            
        except Exception as e:
            logger.error(f"Error fetching deals from GHL: {e}", exc_info=True)
            # Fall back to database if GHL fetch fails
            logger.info("Falling back to database for deals")
            deals_to_check = []
    
    # If no GHL credentials or GHL fetch failed, try database (for mock/test data)
    if not deals_to_check:
        logger.info("No GHL credentials or fetch failed - checking database for deals")
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
    
    # Check each deal for stalled status
    for deal in deals_to_check:
        deal_status = deal.get("status", "")

        # Apply status inclusion filter
        if status_filter and deal_status not in status_filter:
            continue

        # Apply status exclusion filter (e.g. exclude won, lost, abandoned)
        if excluded_statuses and deal_status in excluded_statuses:
            continue

        # Apply tags inclusion filter
        tag_values = _extract_tags(deal)
        if tags_filter:
            if not any(filter_tag in tag_values for filter_tag in tags_filter):
                continue

        # Apply tags exclusion filter (e.g. exclude 'converted', 'do-not-contact')
        if excluded_tags:
            tag_values_lower = [t.lower() for t in tag_values]
            excluded_lower = [t.lower() for t in excluded_tags]
            if any(et in tag_values_lower for et in excluded_lower):
                continue
        
        last_activity_str = deal.get("lastActivityDate") or deal.get("lastActionDate") or deal.get("updatedAt") or deal.get("createdAt")
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
                "title": deal.get("title") or deal.get("name"),
                "status": deal.get("status"),
                "value": deal.get("monetaryValue"),
                "currency": "USD",
                "last_activity_date": None,
                "days_since_activity": 999,  # High number to indicate no activity
                "contact_id": deal.get("contactId"),
                "pipeline_id": deal.get("pipelineId"),
                "tags": _extract_tags(deal),
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
                "title": deal.get("title") or deal.get("name"),
                "status": deal.get("status"),
                "value": deal.get("monetaryValue"),
                "currency": "USD",
                "last_activity_date": last_activity,
                "days_since_activity": days_since,
                "contact_id": deal.get("contactId"),
                "pipeline_id": deal.get("pipelineId"),
                "tags": _extract_tags(deal),
            })
            
            logger.info(
                f"Found stalled deal: {deal.get('id')} "
                f"(inactive for {days_since} days)"
            )
    
    logger.info(f"Found {len(stalled_deals)} stalled deals out of {len(deals_to_check)} checked")
    
    # Close database session
    try:
        db.close()
    except Exception:
        pass
    
    return stalled_deals

