from decimal import Decimal
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CurrencyCode

if TYPE_CHECKING:
    from app.models.account import BrokerAccount
    from app.models.asset import Asset


class Holding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Current point-in-time balance of an asset within a specific broker account.
    Enforces high-precision arbitrary decimals to prevent fractional share drift.
    """

    __tablename__ = "holdings"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Financial Precision: 8 decimal places for US fractional units (DriveWealth)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=24, scale=8),
        nullable=False,
        default=Decimal("0.0"),
    )
    # Financial Precision: 4 decimal places for cost basis and unit prices
    average_buy_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
        default=Decimal("0.0"),
    )
    current_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
        default=Decimal("0.0"),
    )
    currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        default=CurrencyCode.INR,
    )
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    account: Mapped["BrokerAccount"] = relationship("BrokerAccount", back_populates="holdings")
    asset: Mapped["Asset"] = relationship("Asset", back_populates="holdings", lazy="joined")

    __table_args__ = (
        UniqueConstraint("account_id", "asset_id", name="uq_holdings_account_asset"),
    )

    @property
    def invested_value(self) -> Decimal:
        """Calculates total historical capital invested."""
        return self.quantity * self.average_buy_price

    @property
    def current_value(self) -> Decimal:
        """Calculates market value as of the latest recorded price."""
        return self.quantity * self.current_price
