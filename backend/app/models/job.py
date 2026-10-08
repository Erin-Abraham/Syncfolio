from datetime import datetime
from enum import Enum
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import BrokerProvider

if TYPE_CHECKING:
    from app.models.account import BrokerAccount


class JobStatus(str, Enum):
    """Lifecycle state machine of an asynchronous ingestion or reconciliation job."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class IngestionJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Persistent audit ledger tracking long-running asynchronous statement ingestion tasks.
    Enables non-blocking background imports of thousands of multi-year broker transactions.
    """

    __tablename__ = "ingestion_jobs"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[BrokerProvider] = mapped_column(
        SQLEnum(BrokerProvider, name="broker_provider_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus, name="job_status_enum", native_enum=False),
        nullable=False,
        default=JobStatus.PENDING,
        index=True,
    )
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    inserted_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    account: Mapped["BrokerAccount"] = relationship("BrokerAccount")
