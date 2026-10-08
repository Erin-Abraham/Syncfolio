from datetime import datetime, timezone
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_database_connection
from app.models.enums import AssetClass, BrokerProvider
from app.schemas.health import (
    DatabaseHealthStatus,
    LivenessResponse,
    ReadinessResponse,
    SystemInfoResponse,
)

router = APIRouter(prefix="/health", tags=["System Health"])


@router.get(
    "/live",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Process Liveness Probe",
)
async def liveness_probe() -> LivenessResponse:
    """
    Lightweight probe confirming the HTTP server and event loop are responsive.
    Bypasses downstream dependencies to avoid cascading probe timeouts.
    """
    return LivenessResponse(
        status="alive",
        timestamp=datetime.now(timezone.utc),
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="System Readiness Probe",
)
async def readiness_probe() -> ReadinessResponse | JSONResponse:
    """
    Comprehensive readiness probe verifying external dependencies (PostgreSQL).
    Fails with HTTP 503 if the database is unreachable or unresponsive.
    """
    try:
        db_telemetry = await check_database_connection()
        return ReadinessResponse(
            status="ready",
            environment=settings.ENVIRONMENT,
            app_name=settings.APP_NAME,
            version="0.1.0",
            database=DatabaseHealthStatus(**db_telemetry),  # type: ignore[arg-type]
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "environment": settings.ENVIRONMENT,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System Capability & Architecture Info",
)
async def system_info() -> SystemInfoResponse:
    """Exposes supported brokers, aggregators, and target asset taxonomies."""
    return SystemInfoResponse(
        app_name=settings.APP_NAME,
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        supported_brokers=[b.value for b in BrokerProvider],
        supported_asset_classes=[a.value for a in AssetClass],
    )
