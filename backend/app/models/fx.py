from datetime import date
from decimal import Decimal
from sqlalchemy import Date, Enum as SQLEnum, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CurrencyCode


class FxRate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Historical and spot foreign exchange reference rates (e.g. USD/INR).
    Used for multi-currency portfolio valuation and tax cost-basis normalization.
    """

    __tablename__ = "fx_rates"

    base_currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    quote_currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    rate_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    rate: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=6),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(50), default="RBI_REFERENCE", nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "base_currency",
            "quote_currency",
            "rate_date",
            name="uq_fx_rates_pair_date",
        ),
    )
