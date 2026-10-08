import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Enum as SQLEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import BrokerProvider, CurrencyCode

if TYPE_CHECKING:
    from app.models.holding import Holding
    from app.models.user import Portfolio
    from app.models.transaction import Transaction


class BrokerAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Sub-account linked to a financial broker, depository, or aggregator.
    Examples: Zerodha Trading Account, CAMS Folio cluster, DriveWealth US brokerage.
    """

    __tablename__ = "broker_accounts"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[BrokerProvider] = mapped_column(
        SQLEnum(BrokerProvider, name="broker_provider_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    account_number: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        default=CurrencyCode.INR,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="accounts")
    holdings: Mapped[list["Holding"]] = relationship(
        "Holding",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint(
            "portfolio_id",
            "provider",
            "account_number",
            name="uq_broker_account_identity",
        ),
    )
