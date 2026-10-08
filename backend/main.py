from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import check_database_connection, dispose_database_engine

# Structured application logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("syncfolio.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Initializes resource pools on startup and ensures graceful cleanup on termination.
    """
    logger.info("Initializing Syncfolio Backend Engine [Env: %s]...", settings.ENVIRONMENT)
    try:
        telemetry = await check_database_connection()
        logger.info(
            "Database connectivity established: %s (Driver: %s, Latency: %sms)",
            telemetry["status"],
            telemetry["dialect"],
            telemetry["latency_ms"],
        )
    except Exception as exc:
        logger.critical("Fatal: Unable to connect to database at startup: %s", exc)
        raise

    yield

    logger.info("Initiating graceful shutdown...")
    await dispose_database_engine()
    logger.info("Syncfolio Engine shutdown complete.")


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Institutional-grade portfolio reconciliation and drift analysis engine.",
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount versioned API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root_redirect() -> RedirectResponse:
    """Redirect root path to interactive Swagger documentation."""
    return RedirectResponse(url="/docs", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


# Top-level backward compatibility alias for container probes
@app.get("/health", include_in_schema=False)
async def legacy_health_check() -> RedirectResponse:
    """Redirect legacy probe to v1 readiness endpoint."""
    return RedirectResponse(url="/api/v1/health/ready", status_code=status.HTTP_307_TEMPORARY_REDIRECT)