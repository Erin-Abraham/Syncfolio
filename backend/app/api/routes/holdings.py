from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.holding import HoldingResponse
from app.services.reconciliation import reconciliation_service

router = APIRouter(prefix="/holdings", tags=["Portfolio Holdings"])


@router.get(
    "/accounts/{account_id}",
    response_model=list[HoldingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Reconciled Account Holdings",
)
async def get_account_holdings(
    account_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[HoldingResponse]:
    """Retrieves all active positions for an account with real-time unrealized PnL."""
    try:
        holdings = await reconciliation_service.get_account_holdings(session, account_id)
        responses: list[HoldingResponse] = []

        for h in holdings:
            invested = h.invested_value
            current = h.current_value
            pnl = current - invested
            pnl_pct = (
                ((pnl / invested) * Decimal("100.0")).quantize(Decimal("0.01"))
                if invested > Decimal("0.0")
                else Decimal("0.0")
            )

            responses.append(
                HoldingResponse(
                    id=h.id,
                    account_id=h.account_id,
                    asset_id=h.asset_id,
                    symbol=h.asset.symbol,
                    asset_name=h.asset.name,
                    asset_class=h.asset.asset_class,
                    asset_type=h.asset.asset_type,
                    quantity=h.quantity,
                    average_buy_price=h.average_buy_price,
                    current_price=h.current_price,
                    currency=h.currency,
                    invested_value=invested.quantize(Decimal("0.0001")),
                    current_value=current.quantize(Decimal("0.0001")),
                    unrealized_pnl=pnl.quantize(Decimal("0.0001")),
                    unrealized_pnl_percentage=pnl_pct,
                )
            )
        return responses
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch holdings: {str(exc)}",
        )
