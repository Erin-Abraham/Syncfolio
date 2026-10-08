import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.enums import BrokerProvider
from app.schemas.job import (
    AsyncIngestCamsRequest,
    AsyncIngestDriveWealthRequest,
    AsyncIngestZerodhaRequest,
    JobResponse,
)
from app.services.job import job_service

router = APIRouter(prefix="/jobs", tags=["Asynchronous Task Queue"])


@router.post(
    "/ingest/cams",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue Asynchronous CAMS Statement Ingestion",
)
async def enqueue_cams_ingestion(
    payload: AsyncIngestCamsRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> JobResponse:
    """Enqueues bulk CAMS ingestion for background processing with live progress tracking."""
    job = await job_service.create_job(
        session=session,
        account_id=payload.account_id,
        provider=BrokerProvider.CAMS,
        total_records=len(payload.records),
    )
    await session.commit()

    background_tasks.add_task(
        job_service.process_ingestion_job_background,
        job.id,
        payload.account_id,
        BrokerProvider.CAMS,
        payload.records,
    )
    return await job_service.get_job(session, job.id)


@router.post(
    "/ingest/zerodha",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue Asynchronous Zerodha Tradebook Ingestion",
)
async def enqueue_zerodha_ingestion(
    payload: AsyncIngestZerodhaRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> JobResponse:
    """Enqueues Zerodha execution records for non-blocking asynchronous parsing."""
    job = await job_service.create_job(
        session=session,
        account_id=payload.account_id,
        provider=BrokerProvider.ZERODHA,
        total_records=len(payload.records),
    )
    await session.commit()

    background_tasks.add_task(
        job_service.process_ingestion_job_background,
        job.id,
        payload.account_id,
        BrokerProvider.ZERODHA,
        payload.records,
    )
    return await job_service.get_job(session, job.id)


@router.post(
    "/ingest/drivewealth",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue Asynchronous DriveWealth US Ingestion",
)
async def enqueue_drivewealth_ingestion(
    payload: AsyncIngestDriveWealthRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> JobResponse:
    """Enqueues DriveWealth US equities for non-blocking ingestion and reconciliation."""
    job = await job_service.create_job(
        session=session,
        account_id=payload.account_id,
        provider=BrokerProvider.DRIVEWEALTH,
        total_records=len(payload.records),
    )
    await session.commit()

    background_tasks.add_task(
        job_service.process_ingestion_job_background,
        job.id,
        payload.account_id,
        BrokerProvider.DRIVEWEALTH,
        payload.records,
    )
    return await job_service.get_job(session, job.id)


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    status_code=status.HTTP_200_OK,
    summary="Poll Background Job Status",
)
async def get_job_status(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> JobResponse:
    """Polls the execution state, progress counters, and error trace of a background task."""
    try:
        return await job_service.get_job(session, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
