from fastapi import APIRouter
from app.api.routes.fx import router as fx_router
from app.api.routes.health import router as health_router
from app.api.routes.holdings import router as holdings_router
from app.api.routes.ingestion import router as ingestion_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.portfolios import router as portfolios_router
from app.api.routes.reconciliation import router as reconciliation_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(ingestion_router)
api_router.include_router(reconciliation_router)
api_router.include_router(holdings_router)
api_router.include_router(fx_router)
api_router.include_router(portfolios_router)
api_router.include_router(jobs_router)
