import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.mongo import ping_database, ensure_indexes
from app.deps import limiter
from app.routers import (
    auth, populations, pathogens, contact_matrices,
    interventions, scenarios, sim, compare,
    thresholds, sensitivity, calibrate, import_data,
    briefs, reports, admin
)

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("outbreaklab.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting OutbreakLab API Service...")
    logger.info(f"Target MongoDB Database: {settings.MONGODB_DB_NAME}")
    try:
        if ping_database():
            logger.info("MongoDB Atlas connectivity verified successfully.")
            ensure_indexes()
        else:
            logger.warning("MongoDB ping failed or timed out during startup.")
    except Exception as e:
        logger.warning(f"Error checking MongoDB during startup: {e}")
    yield
    logger.info("Shutting down OutbreakLab API Service...")

app = FastAPI(
    title="OutbreakLab REST API",
    description="Infectious Disease Scenario Modelling & Intervention Simulator API",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.APP_ENV == "development" else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root & Health Endpoints
@app.get("/")
def read_root():
    return {
        "name": "OutbreakLab API",
        "version": "2.0.0",
        "purpose": "Preparedness education and policy scenario exploration (NOT a forecast)",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    db_alive = ping_database()
    return {
        "status": "healthy" if db_alive else "degraded",
        "mongodb": "connected" if db_alive else "disconnected",
        "database": settings.MONGODB_DB_NAME,
        "environment": settings.APP_ENV
    }

# Register API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(populations.router, prefix="/api")
app.include_router(pathogens.router, prefix="/api")
app.include_router(contact_matrices.router, prefix="/api")
app.include_router(interventions.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(sim.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(thresholds.router, prefix="/api")
app.include_router(sensitivity.router, prefix="/api")
app.include_router(calibrate.router, prefix="/api")
app.include_router(import_data.router, prefix="/api")
app.include_router(briefs.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
