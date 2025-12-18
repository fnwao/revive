"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.api.webhooks import router as webhooks_router
from app.api.deals import router as deals_router
from app.api.approvals import router as approvals_router
from app.api.dashboard import router as dashboard_router
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(deals_router, prefix="/api/v1")
app.include_router(approvals_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")

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
    # Database tables are managed via Alembic migrations
    # Run: alembic upgrade head
    logger.info("API started - ensure database migrations are up to date")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "revive.ai"}
