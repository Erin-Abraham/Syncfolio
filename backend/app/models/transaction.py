from decimal import Decimal
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CurrencyCode, TransactionType

if TYPE_CHECKING:
    from app.models.account import BrokerAccount
    from app.models.asset import Asset


class Transaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable ledger of executed trades, dividends, fees, and transfers.
    Guarantees idempotency via cryptographic deduplication hashes.
    """

    __tablename__ = "transactions"

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

    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType, name="transaction_type_enum", native_enum=False),
        nullable=False,
        index=True,
    )

    # Financial Precision: 8 decimal places for US fractional lots, 4 for MF units
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=24, scale=8),
        nullable=False,
    )
    price_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
    )
    gross_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
    )
    net_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
    )
    fees: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
        default=Decimal("0.0"),
    )

    currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        default=CurrencyCode.INR,
    )

    trade_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    settlement_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    broker_reference_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    # SHA-256 Idempotency Key: Prevents duplicate ledger ingestion from re-uploaded statements
    deduplication_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    account: Mapped["BrokerAccount"] = relationship("BrokerAccount", back_populates="transactions")
    asset: Mapped["Asset"] = relationship("Asset", back_populates="transactions", lazy="joined")

    __table_args__ = (
        Index("ix_transactions_account_date", "account_id", "trade_date"),
        Index("ix_transactions_asset_date", "asset_id", "trade_date"),
    )
