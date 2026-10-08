from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.enums import CurrencyCode
from app.services.fx import fx_service

router = APIRouter(prefix="/fx", tags=["Foreign Exchange"])


class FxConvertResponse(BaseModel):
    amount: Decimal
    from_currency: CurrencyCode
    to_currency: CurrencyCode
    exchange_rate: Decimal
    converted_amount: Decimal


class FxSeedResponse(BaseModel):
    message: str
    rates_seeded: int


@router.post(
    "/seed",
    response_model=FxSeedResponse,
    status_code=status.HTTP_200_OK,
    summary="Seed Default Exchange Reference Rates",
)
async def seed_rates(
    session: AsyncSession = Depends(get_db_session),
) -> FxSeedResponse:
    """Seeds baseline reference exchange rates if none exist."""
    seeded = await fx_service.seed_default_rates(session)
    await session.commit()
    return FxSeedResponse(
        message="FX rates verified.",
        rates_seeded=seeded,
    )


@router.get(
    "/convert",
    response_model=FxConvertResponse,
    status_code=status.HTTP_200_OK,
    summary="Convert Currency Amount",
)
async def convert_currency(
    amount: Decimal = Query(..., gt=0),
    from_currency: CurrencyCode = Query(..., description="Source currency"),
    to_currency: CurrencyCode = Query(..., description="Target currency"),
    session: AsyncSession = Depends(get_db_session),
) -> FxConvertResponse:
    """Converts a currency amount using latest cached reference rate."""
    try:
        rate = await fx_service.get_exchange_rate(session, from_currency, to_currency)
        converted = (amount * rate).quantize(Decimal("0.0001"))
        return FxConvertResponse(
            amount=amount,
            from_currency=from_currency,
            to_currency=to_currency,
            exchange_rate=rate,
            converted_amount=converted,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
