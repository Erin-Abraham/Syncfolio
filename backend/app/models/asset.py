from typing import TYPE_CHECKING
from sqlalchemy import Enum as SQLEnum, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AssetClass, AssetType, CurrencyCode

if TYPE_CHECKING:
    from app.models.holding import Holding
    from app.models.transaction import Transaction


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Financial instrument canonical record (Domestic Stock, Mutual Fund, US Equity, ETF).
    Maintains cross-broker identifiers (ISIN, CUSIP, Ticker).
    """

    __tablename__ = "assets"

    symbol: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    isin: Mapped[str | None] = mapped_column(String(12), nullable=True, index=True)
    cusip: Mapped[str | None] = mapped_column(String(9), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exchange: Mapped[str | None] = mapped_column(String(20), nullable=True)

    asset_type: Mapped[AssetType] = mapped_column(
        SQLEnum(AssetType, name="asset_type_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    asset_class: Mapped[AssetClass] = mapped_column(
        SQLEnum(AssetClass, name="asset_class_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    currency: Mapped[CurrencyCode] = mapped_column(
        SQLEnum(CurrencyCode, name="currency_code_enum", native_enum=False),
        nullable=False,
        default=CurrencyCode.INR,
    )

    # Relationships
    holdings: Mapped[list["Holding"]] = relationship("Holding", back_populates="asset")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="asset")

    __table_args__ = (
        UniqueConstraint("symbol", "currency", name="uq_assets_symbol_currency"),
        Index("ix_assets_symbol_type", "symbol", "asset_type"),
    )
