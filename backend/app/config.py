"""Application configuration."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # API
    secret_key: str
    api_key_salt: str
    
    # GoHighLevel
    ghl_client_id: str
    ghl_client_secret: str
    ghl_redirect_uri: str
    
    # OpenAI
    openai_api_key: str
    
    # App
    environment: str = "development"
    log_level: str = "INFO"
    use_mock_ghl: bool = True  # Set to False when GHL API is available (env: USE_MOCK_GHL=true/false)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

