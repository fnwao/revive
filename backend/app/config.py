"""Application configuration."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database (defaults to SQLite in /tmp for serverless deployments)
    database_url: str = "sqlite:////tmp/revive.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # API
    secret_key: str = "change-me-in-production"
    api_key_salt: str = "change-me-in-production"

    # GoHighLevel
    ghl_client_id: str = "mock"
    ghl_client_secret: str = "mock"
    ghl_redirect_uri: str = "http://localhost:8000/api/v1/auth/ghl/callback"

    # Anthropic (Claude)
    anthropic_api_key: str = "mock"
    
    # Default GHL credentials (seeded into default user on SQLite startup)
    ghl_access_token: str = ""
    ghl_location_id: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"
    use_mock_ghl: bool = True  # Set to False when GHL API is available (env: USE_MOCK_GHL=true/false)
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()

