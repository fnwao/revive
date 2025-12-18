#!/usr/bin/env python3
"""Admin script to create users and generate API keys."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.auth import generate_api_key, hash_api_key
from app.config import settings
import uuid

def create_user(email: str) -> tuple[str, str]:
    """
    Create a new user and generate API key.
    
    Returns:
        tuple: (user_id, api_key) - The API key is only shown once!
    """
    db: Session = SessionLocal()
    
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ User with email {email} already exists!")
            return None, None
        
        # Generate API key
        api_key = generate_api_key()
        api_key_hash = hash_api_key(api_key, settings.api_key_salt)
        
        # Create user
        user = User(
            id=uuid.uuid4(),
            email=email,
            api_key_hash=api_key_hash
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ User created successfully!")
        print(f"   User ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"\n🔑 API Key (save this - it won't be shown again):")
        print(f"   {api_key}")
        print(f"\n📝 Use this header in API requests:")
        print(f"   Authorization: Bearer {api_key}")
        
        return str(user.id), api_key
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {str(e)}")
        return None, None
    finally:
        db.close()


def list_users():
    """List all users."""
    db: Session = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("No users found.")
            return
        
        print(f"\n📋 Found {len(users)} user(s):\n")
        for user in users:
            print(f"  - {user.email} (ID: {user.id})")
            print(f"    Created: {user.created_at}")
            if user.ghl_access_token:
                print(f"    ✅ GHL connected")
            else:
                print(f"    ⚠️  GHL not connected")
            print()
            
    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Create or list users")
    parser.add_argument("command", choices=["create", "list"], help="Command to run")
    parser.add_argument("--email", help="Email address for new user (required for create)")
    
    args = parser.parse_args()
    
    if args.command == "create":
        if not args.email:
            print("❌ --email is required for create command")
            sys.exit(1)
        create_user(args.email)
    elif args.command == "list":
        list_users()

