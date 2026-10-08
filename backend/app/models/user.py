import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.account import BrokerAccount
    from app.models.allocation import TargetAllocation


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents an application user and root tenant."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    portfolios: Mapped[list["Portfolio"]] = relationship(
        "Portfolio",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Portfolio(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Aggregate portfolio grouping multiple broker and depository accounts."""

    __tablename__ = "portfolios"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="portfolios")
    accounts: Mapped[list["BrokerAccount"]] = relationship(
        "BrokerAccount",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    targets: Mapped[list["TargetAllocation"]] = relationship(
        "TargetAllocation",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
