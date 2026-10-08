from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.ingestion import (
    CamsIngestionRequest,
    DriveWealthIngestionRequest,
    IngestionResultResponse,
    ZerodhaIngestionRequest,
)
from app.services.ingestion import ingestion_service

router = APIRouter(prefix="/ingestion", tags=["Broker Ingestion"])


@router.post(
    "/cams",
    response_model=IngestionResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest CAMS/KFintech Mutual Fund CAS Statement",
)
async def ingest_cams(
    payload: CamsIngestionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResultResponse:
    """Ingests mutual fund transactions, generates deduplication fingerprints, and normalizes assets."""
    try:
        result = await ingestion_service.ingest_cams_statement(
            session=session,
            account_id=payload.account_id,
            records=payload.records,
        )
        await session.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CAMS ingestion failed: {str(exc)}",
        )


@router.post(
    "/zerodha",
    response_model=IngestionResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest Zerodha Tradebook Records",
)
async def ingest_zerodha(
    payload: ZerodhaIngestionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResultResponse:
    """Ingests Zerodha equity trades, creates asset records, and ensures idempotent storage."""
    try:
        result = await ingestion_service.ingest_zerodha_trades(
            session=session,
            account_id=payload.account_id,
            records=payload.records,
        )
        await session.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Zerodha ingestion failed: {str(exc)}",
        )


@router.post(
    "/drivewealth",
    response_model=IngestionResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest DriveWealth / INDmoney US Equities",
)
async def ingest_drivewealth(
    payload: DriveWealthIngestionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResultResponse:
    """Ingests USD-denominated fractional US shares with 8-decimal precision."""
    try:
        result = await ingestion_service.ingest_drivewealth_trades(
            session=session,
            account_id=payload.account_id,
            records=payload.records,
        )
        await session.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DriveWealth ingestion failed: {str(exc)}",
        )
