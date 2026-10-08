from app.api.routes.fx import router as fx_router
from app.api.routes.health import router as health_router
from app.api.routes.holdings import router as holdings_router
from app.api.routes.ingestion import router as ingestion_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.portfolios import router as portfolios_router
from app.api.routes.reconciliation import router as reconciliation_router

__all__ = [
    "health_router",
    "ingestion_router",
    "reconciliation_router",
    "holdings_router",
    "fx_router",
    "portfolios_router",
    "jobs_router",
]
