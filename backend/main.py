from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import check_database_connection

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    debug=settings.DEBUG,
)


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, object]:
    """System health check endpoint verifying process and database connectivity."""
    try:
        db_health = await check_database_connection()
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "database": db_health,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "environment": settings.ENVIRONMENT,
                "error": str(exc),
            },
        )