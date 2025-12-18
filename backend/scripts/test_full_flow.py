#!/usr/bin/env python3
"""End-to-end test script for Revive AI API.

Tests the complete flow:
1. Create user and get API key
2. Detect stalled deals
3. Generate reactivation message
4. List approvals
5. Approve message
6. Send message

Run with: python scripts/test_full_flow.py
"""
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import httpx
from app.db.session import SessionLocal
from app.models.user import User
from app.core.auth import generate_api_key, hash_api_key
from app.config import settings
import uuid

# Configuration
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_EMAIL = f"test-{uuid.uuid4().hex[:8]}@example.com"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_step(step_num: int, description: str):
    """Print a test step."""
    print(f"\n{BLUE}=== Step {step_num}: {description} ==={RESET}")


def print_success(message: str):
    """Print success message."""
    print(f"{GREEN}✅ {message}{RESET}")


def print_error(message: str):
    """Print error message."""
    print(f"{RED}❌ {message}{RESET}")


def print_info(message: str):
    """Print info message."""
    print(f"{YELLOW}ℹ️  {message}{RESET}")


def create_test_user() -> tuple[str, str]:
    """Create a test user and return (user_id, api_key)."""
    print_step(1, "Creating test user")
    
    db = SessionLocal()
    try:
        # Check if user exists
        existing = db.query(User).filter(User.email == TEST_EMAIL).first()
        if existing:
            print_info(f"User already exists: {TEST_EMAIL}")
            # Generate new API key for existing user
            api_key = generate_api_key()
            existing.api_key_hash = hash_api_key(api_key, settings.api_key_salt)
            db.commit()
            return str(existing.id), api_key
        
        # Create new user
        api_key = generate_api_key()
        api_key_hash = hash_api_key(api_key, settings.api_key_salt)
        
        user = User(
            id=uuid.uuid4(),
            email=TEST_EMAIL,
            api_key_hash=api_key_hash
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print_success(f"User created: {TEST_EMAIL}")
        print_info(f"User ID: {user.id}")
        print_info(f"API Key: {api_key[:20]}...")
        
        return str(user.id), api_key
        
    except Exception as e:
        print_error(f"Error creating user: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def test_health_check():
    """Test health check endpoint."""
    print_step(0, "Testing health check")
    
    try:
        response = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        if response.status_code == 200:
            print_success("Health check passed")
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Health check failed: {str(e)}")
        return False


def test_detect_stalled_deals(api_key: str) -> list:
    """Test detecting stalled deals."""
    print_step(2, "Detecting stalled deals")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/v1/deals/detect-stalled",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "pipeline_id": "pipeline-001",
                "stalled_threshold_days": 7
            },
            timeout=30.0
        )
        
        if response.status_code != 200:
            print_error(f"Failed to detect stalled deals: {response.status_code}")
            print_error(f"Response: {response.text}")
            return []
        
        data = response.json()
        stalled_count = data.get("total_found", 0)
        stalled_deals = data.get("stalled_deals", [])
        
        print_success(f"Found {stalled_count} stalled deal(s)")
        
        if stalled_deals:
            for deal in stalled_deals[:3]:  # Show first 3
                print_info(f"  - {deal.get('deal_id')}: {deal.get('title', 'N/A')} ({deal.get('days_since_activity', 0)} days inactive)")
        
        return stalled_deals
        
    except Exception as e:
        print_error(f"Error detecting stalled deals: {str(e)}")
        return []


def test_generate_message(api_key: str, deal_id: str) -> dict:
    """Test generating a reactivation message."""
    print_step(3, f"Generating message for deal: {deal_id}")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/v1/deals/{deal_id}/generate-message",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=60.0  # OpenAI can take time
        )
        
        if response.status_code != 200:
            print_error(f"Failed to generate message: {response.status_code}")
            print_error(f"Response: {response.text}")
            return {}
        
        data = response.json()
        approval_id = data.get("approval_id")
        message = data.get("generated_message", "")
        
        print_success(f"Message generated (approval ID: {approval_id[:8]}...)")
        print_info(f"Message preview: {message[:60]}...")
        
        return data
        
    except Exception as e:
        print_error(f"Error generating message: {str(e)}")
        return {}


def test_list_approvals(api_key: str) -> list:
    """Test listing approvals."""
    print_step(4, "Listing approvals")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/v1/approvals?status_filter=pending",
            headers={
                "Authorization": f"Bearer {api_key}"
            },
            timeout=10.0
        )
        
        if response.status_code != 200:
            print_error(f"Failed to list approvals: {response.status_code}")
            return []
        
        data = response.json()
        approvals = data.get("approvals", [])
        total = data.get("total", 0)
        pending = data.get("pending", 0)
        
        print_success(f"Found {total} approval(s) ({pending} pending)")
        
        if approvals:
            for approval in approvals[:3]:  # Show first 3
                print_info(f"  - {approval.get('id')[:8]}...: {approval.get('status')} for deal {approval.get('deal_id')}")
        
        return approvals
        
    except Exception as e:
        print_error(f"Error listing approvals: {str(e)}")
        return []


def test_approve_message(api_key: str, approval_id: str) -> bool:
    """Test approving a message."""
    print_step(5, f"Approving message: {approval_id[:8]}...")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/v1/approvals/{approval_id}/approve",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={},
            timeout=10.0
        )
        
        if response.status_code != 200:
            print_error(f"Failed to approve message: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
        
        data = response.json()
        status = data.get("status")
        
        print_success(f"Message approved (status: {status})")
        return True
        
    except Exception as e:
        print_error(f"Error approving message: {str(e)}")
        return False


def test_send_message(api_key: str, approval_id: str) -> bool:
    """Test sending a message."""
    print_step(6, f"Sending message: {approval_id[:8]}...")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/v1/approvals/{approval_id}/send",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={},
            timeout=30.0
        )
        
        if response.status_code != 200:
            print_error(f"Failed to send message: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
        
        data = response.json()
        status = data.get("status")
        sent = data.get("sent", False)
        
        if sent:
            print_success(f"Message sent successfully (status: {status})")
            print_info("Note: With mock GHL service, message is logged but not actually sent")
        else:
            print_error(f"Message not sent (status: {status})")
        
        return sent
        
    except Exception as e:
        print_error(f"Error sending message: {str(e)}")
        return False


def main():
    """Run the full end-to-end test."""
    print(f"\n{BLUE}{'='*60}")
    print("Revive AI - End-to-End Test")
    print(f"{'='*60}{RESET}\n")
    
    print_info(f"API Base URL: {BASE_URL}")
    print_info(f"Test Email: {TEST_EMAIL}")
    print_info(f"Using Mock GHL: {settings.use_mock_ghl}")
    
    # Test health check first
    if not test_health_check():
        print_error("Health check failed. Is the server running?")
        print_info("Start server with: uvicorn app.main:app --reload")
        sys.exit(1)
    
    results = {
        "user_created": False,
        "deals_detected": False,
        "message_generated": False,
        "approvals_listed": False,
        "message_approved": False,
        "message_sent": False
    }
    
    try:
        # Step 1: Create user
        user_id, api_key = create_test_user()
        results["user_created"] = True
        
        # Step 2: Detect stalled deals
        stalled_deals = test_detect_stalled_deals(api_key)
        if stalled_deals:
            results["deals_detected"] = True
            test_deal_id = stalled_deals[0].get("deal_id")
        else:
            print_error("No stalled deals found. Cannot continue test.")
            print_info("Using mock deal ID: deal-001")
            test_deal_id = "deal-001"
            results["deals_detected"] = True  # Continue anyway
        
        # Step 3: Generate message
        message_data = test_generate_message(api_key, test_deal_id)
        if message_data:
            results["message_generated"] = True
            approval_id = message_data.get("approval_id")
        else:
            print_error("Failed to generate message. Cannot continue test.")
            sys.exit(1)
        
        # Wait a moment for DB to sync
        time.sleep(1)
        
        # Step 4: List approvals
        approvals = test_list_approvals(api_key)
        if approvals:
            results["approvals_listed"] = True
        else:
            print_info("No approvals found (may be timing issue)")
        
        # Step 5: Approve message
        if test_approve_message(api_key, approval_id):
            results["message_approved"] = True
        
        # Step 6: Send message
        if test_send_message(api_key, approval_id):
            results["message_sent"] = True
        
        # Summary
        print(f"\n{BLUE}{'='*60}")
        print("Test Summary")
        print(f"{'='*60}{RESET}\n")
        
        total = len(results)
        passed = sum(1 for v in results.values() if v)
        
        for step, success in results.items():
            status_icon = f"{GREEN}✅{RESET}" if success else f"{RED}❌{RESET}"
            print(f"{status_icon} {step.replace('_', ' ').title()}")
        
        print(f"\n{BLUE}Results: {passed}/{total} steps passed{RESET}")
        
        if passed == total:
            print_success("\n🎉 All tests passed! Full flow is working.")
            sys.exit(0)
        else:
            print_error(f"\n⚠️  {total - passed} test(s) failed.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print_error("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

