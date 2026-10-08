from datetime import datetime
import uuid
from pydantic import BaseModel, Field
from app.models.enums import BrokerProvider
from app.models.job import JobStatus
from app.schemas.ingestion import (
    CamsTransactionDTO,
    DriveWealthTradeDTO,
    ZerodhaTradeDTO,
)


class JobResponse(BaseModel):
    """Telemetry report for background asynchronous jobs."""
    job_id: uuid.UUID
    account_id: uuid.UUID
    provider: BrokerProvider
    status: JobStatus
    total_records: int
    processed_records: int
    inserted_records: int
    duplicate_records: int
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class AsyncIngestCamsRequest(BaseModel):
    account_id: uuid.UUID
    records: list[CamsTransactionDTO]


class AsyncIngestZerodhaRequest(BaseModel):
    account_id: uuid.UUID
    records: list[ZerodhaTradeDTO]


class AsyncIngestDriveWealthRequest(BaseModel):
    account_id: uuid.UUID
    records: list[DriveWealthTradeDTO]
