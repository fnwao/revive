#!/usr/bin/env python3
"""Script to add test data to the database."""
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.deal import Deal
from app.models.approval_queue import ApprovalQueue, ApprovalStatus
from app.models.conversation import Conversation, MessageType
import uuid

# Test data
TEST_DEALS = [
    {
        "ghl_deal_id": "deal-001",
        "ghl_contact_id": "contact-001",
        "ghl_pipeline_id": "pipeline-001",
        "title": "Acme Corp - Enterprise Package",
        "status": "active",
        "value": 5000.00,
        "currency": "USD",
        "days_since_activity": 10,
    },
    {
        "ghl_deal_id": "deal-002",
        "ghl_contact_id": "contact-002",
        "ghl_pipeline_id": "pipeline-001",
        "title": "TechStart Inc - Starter Package",
        "status": "active",
        "value": 2000.00,
        "currency": "USD",
        "days_since_activity": 8,
    },
    {
        "ghl_deal_id": "deal-003",
        "ghl_contact_id": "contact-003",
        "ghl_pipeline_id": "pipeline-001",
        "title": "Global Solutions - Premium",
        "status": "active",
        "value": 10000.00,
        "currency": "USD",
        "days_since_activity": 12,
    },
    {
        "ghl_deal_id": "deal-004",
        "ghl_contact_id": "contact-004",
        "ghl_pipeline_id": "pipeline-001",
        "title": "InnovateCo - Growth Package",
        "status": "active",
        "value": 7500.00,
        "currency": "USD",
        "days_since_activity": 15,
    },
    {
        "ghl_deal_id": "deal-005",
        "ghl_contact_id": "contact-005",
        "ghl_pipeline_id": "pipeline-001",
        "title": "NextGen Systems - Professional",
        "status": "active",
        "value": 8500.00,
        "currency": "USD",
        "days_since_activity": 9,
    },
    {
        "ghl_deal_id": "deal-006",
        "ghl_contact_id": "contact-006",
        "ghl_pipeline_id": "pipeline-001",
        "title": "CloudScale Ventures - Enterprise",
        "status": "active",
        "value": 12000.00,
        "currency": "USD",
        "days_since_activity": 11,
    },
    {
        "ghl_deal_id": "deal-007",
        "ghl_contact_id": "contact-007",
        "ghl_pipeline_id": "pipeline-001",
        "title": "DataFlow Inc - Starter Package",
        "status": "active",
        "value": 1800.00,
        "currency": "USD",
        "days_since_activity": 13,
    },
    {
        "ghl_deal_id": "deal-008",
        "ghl_contact_id": "contact-008",
        "ghl_pipeline_id": "pipeline-001",
        "title": "SecureNet Solutions - Premium",
        "status": "active",
        "value": 9500.00,
        "currency": "USD",
        "days_since_activity": 7,
    },
    {
        "ghl_deal_id": "deal-009",
        "ghl_contact_id": "contact-009",
        "ghl_pipeline_id": "pipeline-001",
        "title": "Velocity Partners - Growth Package",
        "status": "active",
        "value": 4500.00,
        "currency": "USD",
        "days_since_activity": 16,
    },
    {
        "ghl_deal_id": "deal-010",
        "ghl_contact_id": "contact-010",
        "ghl_pipeline_id": "pipeline-001",
        "title": "PrimeTech Industries - Enterprise",
        "status": "active",
        "value": 15000.00,
        "currency": "USD",
        "days_since_activity": 18,
    },
    {
        "ghl_deal_id": "deal-011",
        "ghl_contact_id": "contact-011",
        "ghl_pipeline_id": "pipeline-001",
        "title": "Apex Digital - Starter Package",
        "status": "active",
        "value": 1800.00,
        "currency": "USD",
        "days_since_activity": 7,
    },
    {
        "ghl_deal_id": "deal-012",
        "ghl_contact_id": "contact-012",
        "ghl_pipeline_id": "pipeline-001",
        "title": "Summit Enterprises - Professional",
        "status": "active",
        "value": 9200.00,
        "currency": "USD",
        "days_since_activity": 19,
    },
]

TEST_MESSAGES = {
    "deal-001": "Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested in moving forward. We've had some great success with similar companies, and I'd love to show you how this could work for Acme Corp. Are you available for a quick call this week?",
    "deal-002": "Hey Mike! Hope you're doing well. I saw we started discussing the Starter Package a few weeks back but haven't finalized things yet. I wanted to reach out and see if there are any questions I can answer or if you'd like to revisit the proposal. What works best for you?",
    "deal-003": "Hi Jennifer! I wanted to follow up on our Premium package discussion. I know timing is everything, and I wanted to make sure we're aligned on next steps. We've added some new features that might be perfect for Global Solutions. Would you be open to a brief conversation?",
    "deal-004": "Hi David! I wanted to touch base on the Growth Package we discussed. I know things can get busy, but I wanted to make sure we're still aligned on moving forward. Would you be available for a quick call this week to discuss next steps?",
    "deal-005": "Hey Lisa! Hope all is well. I noticed we haven't connected since our last conversation about the Professional package. I wanted to check in and see if you have any questions or if you'd like to schedule a follow-up. What works for you?",
    "deal-006": "Hi Robert! I wanted to follow up on the Enterprise package we discussed. I know timing is crucial, and I wanted to make sure we're still on track. We've had some exciting updates that might be relevant for CloudScale Ventures. Are you available for a quick chat?",
    "deal-007": "Hey Amanda! I saw we started discussing the Starter Package but haven't finalized things. I wanted to reach out and see if there's anything I can clarify or if you'd like to revisit the proposal. What works best for you?",
    "deal-008": "Hi James! I wanted to check in on the Premium package we discussed. I know things can get busy, but I wanted to make sure we're still aligned. Would you be available for a quick call to discuss next steps?",
    "deal-009": "Hey Maria! Hope you're doing well. I noticed we haven't connected since our conversation about the Growth Package. I wanted to follow up and see if you have any questions or if you'd like to schedule a follow-up. What works for you?",
    "deal-010": "Hi Thomas! I wanted to touch base on the Enterprise package we discussed. I know timing is everything, and I wanted to make sure we're still on track. We've had some exciting updates that might be relevant. Are you available for a quick chat?",
    "deal-011": "Hey Emily! I saw we started discussing the Starter Package but haven't finalized things yet. I wanted to reach out and see if there are any questions I can answer or if you'd like to revisit the proposal. What works best for you?",
    "deal-012": "Hi Michael! I wanted to follow up on the Professional package we discussed. I know things can get busy, but I wanted to make sure we're still aligned on moving forward. Would you be available for a quick call this week?",
}


def get_user_by_email(email: str, db: Session) -> User | None:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def add_test_data(email: str = "your@email.com"):
    """Add test deals and approvals to the database."""
    db: Session = SessionLocal()
    
    try:
        # Get user
        user = get_user_by_email(email, db)
        if not user:
            print(f"❌ User with email {email} not found!")
            print("   Please create a user first with: python scripts/create_user.py create --email {email}")
            return
        
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Create deals
        created_deals = []
        for deal_data in TEST_DEALS:
            # Check if deal already exists
            existing = db.query(Deal).filter(Deal.ghl_deal_id == deal_data["ghl_deal_id"]).first()
            if existing:
                print(f"   ⚠️  Deal {deal_data['ghl_deal_id']} already exists, skipping...")
                created_deals.append(existing)
                continue
            
            # Calculate last activity date
            last_activity = datetime.now() - timedelta(days=deal_data["days_since_activity"])
            
            deal = Deal(
                id=uuid.uuid4(),
                user_id=user.id,
                ghl_deal_id=deal_data["ghl_deal_id"],
                ghl_contact_id=deal_data["ghl_contact_id"],
                ghl_pipeline_id=deal_data["ghl_pipeline_id"],
                title=deal_data["title"],
                status=deal_data["status"],
                value=Decimal(str(deal_data["value"])),
                currency=deal_data["currency"],
                last_activity_date=last_activity,
            )
            
            db.add(deal)
            created_deals.append(deal)
            print(f"   ✅ Created deal: {deal_data['title']}")
        
        db.commit()
        print(f"\n✅ Created {len(created_deals)} deals")
        
        # Create approvals for all deals with varied statuses
        approval_statuses = [
            ApprovalStatus.PENDING,
            ApprovalStatus.PENDING,
            ApprovalStatus.PENDING,
            ApprovalStatus.APPROVED,
            ApprovalStatus.APPROVED,
            ApprovalStatus.SENT,
            ApprovalStatus.SENT,
            ApprovalStatus.REJECTED,
            ApprovalStatus.PENDING,
            ApprovalStatus.APPROVED,
            ApprovalStatus.PENDING,
            ApprovalStatus.SENT,
        ]
        
        created_approvals = []
        for i, deal in enumerate(created_deals):
            # Check if approval already exists for this deal
            existing_count = db.query(ApprovalQueue).filter(
                ApprovalQueue.deal_id == deal.id
            ).count()
            
            # Create multiple approvals for some deals to make it more realistic
            approvals_to_create = 1
            if i < 3:  # First 3 deals get 2 approvals each
                approvals_to_create = 2
            
            for j in range(approvals_to_create):
                if existing_count >= approvals_to_create:
                    print(f"   ⚠️  Deal {deal.ghl_deal_id} already has {existing_count} approvals, skipping...")
                    break
                
                # Use different statuses for multiple approvals
                if j == 0:
                    status = approval_statuses[i % len(approval_statuses)]
                else:
                    # Second approval is always pending (newer)
                    status = ApprovalStatus.PENDING
            
                message = TEST_MESSAGES.get(deal.ghl_deal_id, "Test message")
                if j > 0:
                    # Vary the message for second approval
                    message = f"Follow-up: {message}"
                
                approval = ApprovalQueue(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    deal_id=deal.id,
                    ghl_deal_id=deal.ghl_deal_id,
                    ghl_contact_id=deal.ghl_contact_id,
                    generated_message=message,
                    status=status,
                    created_at=datetime.now() - timedelta(hours=(i*2 + j)),
                )
                
                if status == ApprovalStatus.APPROVED:
                    approval.approved_at = datetime.now() - timedelta(hours=(i*2 + j - 1))
                
                if status == ApprovalStatus.SENT:
                    approval.approved_at = datetime.now() - timedelta(hours=(i*2 + j - 2))
                    approval.sent_at = datetime.now() - timedelta(hours=(i*2 + j - 3))
                    approval.final_message = message
                
                db.add(approval)
                created_approvals.append(approval)
                existing_count += 1
                print(f"   ✅ Created approval #{j+1} for {deal.title} (status: {status.value})")
        
        db.commit()
        print(f"\n✅ Created {len(created_approvals)} approvals")
        
        # Create conversation history for deals
        conversation_templates = {
            "deal-001": [
                {"type": MessageType.EMAIL, "direction": "outbound", "content": "Hi Sarah, thanks for your interest in our Enterprise Package. I've attached the proposal for your review.", "days_ago": 25},
                {"type": MessageType.EMAIL, "direction": "inbound", "content": "Thanks! I'll review it and get back to you.", "days_ago": 24},
                {"type": MessageType.SMS, "direction": "outbound", "content": "Hi Sarah, just wanted to check if you had a chance to review the proposal?", "days_ago": 15},
                {"type": MessageType.NOTE, "direction": "outbound", "content": "Follow-up call scheduled for next week", "days_ago": 12},
            ],
            "deal-002": [
                {"type": MessageType.SMS, "direction": "outbound", "content": "Hey Mike! Thanks for the call today. Here's the Starter Package info we discussed.", "days_ago": 20},
                {"type": MessageType.SMS, "direction": "inbound", "content": "Looks good! Let me discuss with my team.", "days_ago": 19},
                {"type": MessageType.EMAIL, "direction": "outbound", "content": "Hi Mike, following up on our conversation. Any questions about the Starter Package?", "days_ago": 10},
            ],
            "deal-003": [
                {"type": MessageType.EMAIL, "direction": "outbound", "content": "Hi Jennifer, great meeting you at the conference! Here's the Premium package details we discussed.", "days_ago": 18},
                {"type": MessageType.EMAIL, "direction": "inbound", "content": "Thanks! The features look interesting. I need to check our budget.", "days_ago": 17},
                {"type": MessageType.CALL, "direction": "outbound", "content": "Call: Discussed pricing options and implementation timeline", "days_ago": 14},
            ],
            "deal-004": [
                {"type": MessageType.SMS, "direction": "outbound", "content": "Hi David, thanks for the demo request. Here's the Growth Package proposal.", "days_ago": 22},
                {"type": MessageType.SMS, "direction": "inbound", "content": "Thanks! When can we schedule a follow-up?", "days_ago": 21},
                {"type": MessageType.EMAIL, "direction": "outbound", "content": "Hi David, I've sent over the detailed proposal. Let me know if you have any questions.", "days_ago": 18},
            ],
            "deal-005": [
                {"type": MessageType.EMAIL, "direction": "outbound", "content": "Hi Lisa, following up on our conversation about the Professional package.", "days_ago": 16},
                {"type": MessageType.EMAIL, "direction": "inbound", "content": "Thanks for the info. I'll review and get back to you.", "days_ago": 15},
                {"type": MessageType.SMS, "direction": "outbound", "content": "Hi Lisa, just checking in. Any questions about the Professional package?", "days_ago": 11},
            ],
        }
        
        created_conversations = []
        for deal in created_deals[:6]:  # Add conversations for first 6 deals
            template = conversation_templates.get(deal.ghl_deal_id, [])
            if not template:
                continue
            
            for msg_data in template:
                conversation = Conversation(
                    id=uuid.uuid4(),
                    deal_id=deal.id,
                    user_id=user.id,
                    ghl_contact_id=deal.ghl_contact_id,
                    message_type=msg_data["type"],
                    direction=msg_data["direction"],
                    content=msg_data["content"],
                    sent_at=datetime.now() - timedelta(days=msg_data["days_ago"]),
                )
                db.add(conversation)
                created_conversations.append(conversation)
            
            if template:
                print(f"   ✅ Created {len(template)} conversations for {deal.title}")
        
        db.commit()
        print(f"\n✅ Created {len(created_conversations)} conversation messages")
        
        print(f"\n🎉 Test data added successfully!")
        print(f"   - {len(created_deals)} deals")
        print(f"   - {len(created_approvals)} approvals")
        print(f"   - {len(created_conversations)} conversation messages")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error adding test data: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Add test data to the database")
    parser.add_argument("--email", default="your@email.com", help="User email to associate test data with")
    
    args = parser.parse_args()
    add_test_data(args.email)

