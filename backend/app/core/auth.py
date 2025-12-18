"""Authentication utilities and dependencies."""
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import bcrypt
from app.db.session import get_db
from app.models.user import User
import secrets
import logging
import hashlib

logger = logging.getLogger(__name__)


def generate_api_key() -> str:
    """Generate a new API key."""
    return secrets.token_urlsafe(32)  # 32 bytes = 43 characters URL-safe


def hash_api_key(api_key: str, salt: str) -> str:
    """Hash an API key with salt using bcrypt."""
    # Bcrypt has a 72-byte limit, so we hash salt+key with SHA256 first
    # to get a fixed 64-byte value, then hash that with bcrypt
    combined = f"{salt}:{api_key}"
    sha256_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
    # SHA256 hexdigest is 64 bytes, well under the 72-byte limit
    # Hash with bcrypt directly
    hashed = bcrypt.hashpw(sha256_hash.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')


def verify_api_key(api_key: str, hashed_key: str, salt: str) -> bool:
    """Verify an API key against its hash."""
    # Use the same hashing approach as in hash_api_key
    combined = f"{salt}:{api_key}"
    sha256_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
    # Verify with bcrypt directly
    try:
        return bcrypt.checkpw(sha256_hash.encode('utf-8'), hashed_key.encode('utf-8'))
    except Exception as e:
        logger.debug(f"Error verifying API key: {e}")
        return False


async def get_current_user(
    authorization: str = Header(..., description="Bearer API key"),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get current user from API key.
    
    Expects: Authorization: Bearer <api_key>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header. Expected: Bearer <api_key>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    api_key = authorization.replace("Bearer ", "").strip()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get salt from config (in production, this should be per-user or from config)
    from app.config import settings
    salt = settings.api_key_salt
    
    # Find user by matching hashed API key
    # Note: For MVP, we check all users. For production with many users,
    # consider storing a lookup table or using JWT tokens instead.
    users = db.query(User).all()
    
    for user in users:
        try:
            if verify_api_key(api_key, user.api_key_hash, salt):
                logger.info(f"Authenticated user: {user.id}")
                return user
        except Exception as e:
            # Skip users with invalid hash format
            logger.debug(f"Error verifying key for user {user.id}: {e}")
            continue
    
    # If no match found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional: Dependency for endpoints that don't require auth
async def get_optional_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User | None:
    """Optional authentication - returns None if no auth provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        return await get_current_user(authorization, db)
    except HTTPException:
        return None

