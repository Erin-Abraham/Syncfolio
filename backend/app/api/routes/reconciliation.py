import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.holding import ReconciliationSummaryResponse
from app.services.reconciliation import reconciliation_service

router = APIRouter(prefix="/reconciliation", tags=["Portfolio Reconciliation"])


@router.post(
    "/accounts/{account_id}",
    response_model=ReconciliationSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Reconcile Account Ledger and Holdings",
)
async def reconcile_account(
    account_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationSummaryResponse:
    """
    Rebuilds holding balances from the historical transaction ledger.
    Calculates weighted average cost basis and eliminates position drift.
    """
    try:
        summary = await reconciliation_service.reconcile_account(session, account_id)
        await session.commit()
        return summary
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconciliation error: {str(exc)}",
        )
