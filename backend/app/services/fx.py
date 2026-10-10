from datetime import date
from decimal import Decimal
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import CurrencyCode
from app.models.fx import FxRate

logger = logging.getLogger("syncfolio.fx")

# Default fallback spot reference rates if historical table entries are absent
DEFAULT_FALLBACK_RATES: dict[tuple[CurrencyCode, CurrencyCode], Decimal] = {
    (CurrencyCode.USD, CurrencyCode.INR): Decimal("96.880000"),
    (CurrencyCode.INR, CurrencyCode.USD): Decimal("0.010322"),
}


class FxService:
    """
    Manages multi-currency foreign exchange rates, conversion logic, and caching.
    Ensures USD-denominated US equities are properly reconciled with INR mutual funds.
    """

    def __init__(self) -> None:
        self._cache: dict[tuple[CurrencyCode, CurrencyCode, date], Decimal] = {}

    async def get_exchange_rate(
        self,
        session: AsyncSession,
        base_currency: CurrencyCode,
        quote_currency: CurrencyCode,
        target_date: date | None = None,
    ) -> Decimal:
        """
        Retrieves the exact or nearest-prior FX conversion rate for a currency pair.
        """
        if base_currency == quote_currency:
            return Decimal("1.0")

        lookup_date = target_date or date.today()
        cache_key = (base_currency, quote_currency, lookup_date)

        if cache_key in self._cache:
            return self._cache[cache_key]

        stmt = (
            select(FxRate.rate)
            .where(
                FxRate.base_currency == base_currency,
                FxRate.quote_currency == quote_currency,
                FxRate.rate_date <= lookup_date,
            )
            .order_by(FxRate.rate_date.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        rate = result.scalar_one_or_none()

        if rate is not None:
            self._cache[cache_key] = rate
            return rate

        # Fallback to default reference matrix if date is missing
        fallback = DEFAULT_FALLBACK_RATES.get((base_currency, quote_currency))
        if fallback:
            logger.warning(
                "No DB FX rate found for %s->%s on %s; using default fallback %s",
                base_currency,
                quote_currency,
                lookup_date,
                fallback,
            )
            return fallback

        raise ValueError(f"Unsupported currency conversion pair: {base_currency} to {quote_currency}")

    async def convert(
        self,
        session: AsyncSession,
        amount: Decimal,
        from_currency: CurrencyCode,
        to_currency: CurrencyCode,
        target_date: date | None = None,
    ) -> Decimal:
        """Converts an arbitrary Decimal amount into the target currency."""
        rate = await self.get_exchange_rate(session, from_currency, to_currency, target_date)
        return (amount * rate).quantize(Decimal("0.0001"))

    async def seed_default_rates(self, session: AsyncSession) -> int:
        """Seeds standard baseline rates if the table is empty."""
        stmt = select(FxRate).limit(1)
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            return 0

        today = date.today()
        rates_to_seed = [
            FxRate(
                base_currency=CurrencyCode.USD,
                quote_currency=CurrencyCode.INR,
                rate_date=today,
                rate=Decimal("96.880000"),
                source="RBI_REFERENCE",
            ),
            FxRate(
                base_currency=CurrencyCode.INR,
                quote_currency=CurrencyCode.USD,
                rate_date=today,
                rate=Decimal("0.010322"),
                source="RBI_REFERENCE",
            ),
        ]
        session.add_all(rates_to_seed)
        await session.flush()
        return len(rates_to_seed)


fx_service = FxService()
