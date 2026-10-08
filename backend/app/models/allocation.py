from decimal import Decimal
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Enum as SQLEnum, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AssetClass

if TYPE_CHECKING:
    from app.models.user import Portfolio


class TargetAllocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Desired target allocation percentage and tolerance threshold for a macro asset class.
    Enforces that a portfolio's total target allocations sum to exactly 100.0%.
    """

    __tablename__ = "target_allocations"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_class: Mapped[AssetClass] = mapped_column(
        SQLEnum(AssetClass, name="asset_class_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    target_percentage: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=False,
    )
    rebalance_threshold_pct: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=False,
        default=Decimal("5.00"),
    )

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="targets")

    __table_args__ = (
        UniqueConstraint(
            "portfolio_id",
            "asset_class",
            name="uq_target_allocations_portfolio_asset_class",
        ),
    )
