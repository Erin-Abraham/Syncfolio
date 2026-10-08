from datetime import datetime, timezone
import logging
from typing import Any
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.enums import BrokerProvider
from app.models.job import IngestionJob, JobStatus
from app.schemas.job import JobResponse
from app.services.ingestion import ingestion_service
from app.services.reconciliation import reconciliation_service

logger = logging.getLogger("syncfolio.jobs")


class JobService:
    """
    Manages long-running asynchronous statement ingestion and ledger reconciliation tasks.
    Coordinates background execution, state persistence, and error logging.
    """

    async def create_job(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
        provider: BrokerProvider,
        total_records: int,
    ) -> IngestionJob:
        """Initializes a new background task ledger entry in PENDING state."""
        job = IngestionJob(
            account_id=account_id,
            provider=provider,
            status=JobStatus.PENDING,
            total_records=total_records,
            processed_records=0,
            inserted_records=0,
            duplicate_records=0,
        )
        session.add(job)
        await session.flush()
        return job

    async def get_job(
        self,
        session: AsyncSession,
        job_id: uuid.UUID,
    ) -> JobResponse:
        """Queries the current lifecycle state and progress metrics for a job."""
        stmt = select(IngestionJob).where(IngestionJob.id == job_id)
        job = (await session.execute(stmt)).scalar_one_or_none()
        if not job:
            raise ValueError(f"Job {job_id} not found.")

        return JobResponse(
            job_id=job.id,
            account_id=job.account_id,
            provider=job.provider,
            status=job.status,
            total_records=job.total_records,
            processed_records=job.processed_records,
            inserted_records=job.inserted_records,
            duplicate_records=job.duplicate_records,
            error_message=job.error_message,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )

    async def process_ingestion_job_background(
        self,
        job_id: uuid.UUID,
        account_id: uuid.UUID,
        provider: BrokerProvider,
        records: list[Any],
    ) -> None:
        """
        Background worker routine. Executes ingestion, reconciles the ledger,
        and marks the job COMPLETED or FAILED.
        """
        logger.info("Starting background execution for job %s [%s]...", job_id, provider.value)
        async with async_session_factory() as session:
            stmt = select(IngestionJob).where(IngestionJob.id == job_id)
            job = (await session.execute(stmt)).scalar_one_or_none()
            if not job:
                logger.error("Job %s not found in background context.", job_id)
                return

            job.status = JobStatus.PROCESSING
            await session.commit()

            try:
                # 1. Route to specialized broker parser
                if provider == BrokerProvider.CAMS:
                    result = await ingestion_service.ingest_cams_statement(
                        session, account_id, records
                    )
                elif provider == BrokerProvider.ZERODHA:
                    result = await ingestion_service.ingest_zerodha_trades(
                        session, account_id, records
                    )
                elif provider == BrokerProvider.DRIVEWEALTH:
                    result = await ingestion_service.ingest_drivewealth_trades(
                        session, account_id, records
                    )
                else:
                    raise ValueError(f"Unsupported broker provider for async ingestion: {provider}")

                # 2. Automatically trigger chronological ledger reconciliation
                await reconciliation_service.reconcile_account(session, account_id)
                await session.commit()

                # 3. Mark job completed
                job.status = JobStatus.COMPLETED
                job.processed_records = result.total_records
                job.inserted_records = result.inserted_records
                job.duplicate_records = result.duplicate_records_skipped
                job.completed_at = datetime.now(timezone.utc)
                await session.commit()
                logger.info("Job %s successfully completed. Inserted %s records.", job_id, result.inserted_records)

            except Exception as exc:
                logger.error("Job %s execution failed: %s", job_id, exc)
                await session.rollback()
                job.status = JobStatus.FAILED
                job.error_message = str(exc)
                job.completed_at = datetime.now(timezone.utc)
                await session.commit()


job_service = JobService()
