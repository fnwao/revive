"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
# Note: webhooks_router is for GHL webhook receiver (if exists)
# webhooks_config_router is for configuring outgoing webhooks
from app.api.deals import router as deals_router
from app.api.approvals import router as approvals_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router
from app.api.knowledge_base import router as knowledge_base_router
from app.api.notifications import router as notifications_router
from app.api.templates import router as templates_router
from app.api.teams import router as teams_router
from app.api.webhooks import router as webhooks_config_router
import logging
import os

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Revive.ai API",
    description="AI-powered revenue recovery system for GoHighLevel",
    version="1.0.0"
)

# CORS middleware
cors_origins = ["*"] if settings.environment == "development" else [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(webhooks_router, prefix="/api/v1")  # GHL webhook receiver (if exists)
app.include_router(deals_router, prefix="/api/v1")
app.include_router(approvals_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(knowledge_base_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(templates_router, prefix="/api/v1")
app.include_router(teams_router, prefix="/api/v1")
app.include_router(webhooks_config_router, prefix="/api/v1")

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    # Serve static assets (CSS, JS)
    static_path = frontend_path
    app.mount("/static", StaticFiles(directory=static_path), name="static")
    
    @app.get("/")
    async def serve_frontend():
        """Serve the frontend application."""
        index_path = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Frontend not found. Run from project root."}
    
    @app.get("/styles.css")
    async def serve_css():
        """Serve CSS file."""
        css_path = os.path.join(frontend_path, "styles.css")
        if os.path.exists(css_path):
            return FileResponse(css_path, media_type="text/css")
        return {"error": "CSS not found"}
    
    @app.get("/app.js")
    async def serve_js():
        """Serve JavaScript file."""
        js_path = os.path.join(frontend_path, "app.js")
        if os.path.exists(js_path):
            return FileResponse(js_path, media_type="application/javascript")
        return {"error": "JS not found"}


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    logger.info("Starting Revive.ai API...")
    # Auto-create tables for serverless/SQLite deployments
    if settings.database_url.startswith("sqlite"):
        from app.db.session import init_db, SessionLocal
        init_db()
        logger.info("SQLite tables created")
        # Seed default user with GHL credentials from env vars
        _seed_default_user(SessionLocal())
    else:
        logger.info("API started - ensure database migrations are up to date")


def _seed_default_user(db):
    """Seed a default user with GHL credentials if env vars are set."""
    try:
        from app.models.user import User
        from app.core.auth import hash_api_key
        import uuid

        existing = db.query(User).filter(User.email == "admin@revive.ai").first()
        if existing:
            # Update GHL credentials if env vars changed
            if settings.ghl_access_token:
                existing.ghl_access_token = settings.ghl_access_token
            if settings.ghl_location_id:
                existing.ghl_location_id = settings.ghl_location_id
            db.commit()
            logger.info("Default user GHL credentials updated")
            return

        # Create default user with a known API key
        default_api_key = "revive-default-api-key-2024"
        api_key_hash = hash_api_key(default_api_key, settings.api_key_salt)

        user = User(
            id=uuid.uuid4(),
            email="admin@revive.ai",
            api_key_hash=api_key_hash,
            ghl_access_token=settings.ghl_access_token or None,
            ghl_location_id=settings.ghl_location_id or None,
        )
        db.add(user)
        db.commit()
        logger.info(f"Default user seeded: admin@revive.ai (API key: {default_api_key})")
    except Exception as e:
        logger.error(f"Error seeding default user: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "revive.ai"}
