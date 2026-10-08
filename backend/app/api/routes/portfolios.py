import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.drift import (
    PortfolioDriftResponse,
    RebalancePlanRequest,
    RebalancePlanResponse,
    SetTargetAllocationsRequest,
    TargetAllocationResponse,
)
from app.services.drift import drift_service

router = APIRouter(prefix="/portfolios", tags=["Portfolio Drift & Rebalancing"])


@router.post(
    "/{portfolio_id}/targets",
    response_model=list[TargetAllocationResponse],
    status_code=status.HTTP_200_OK,
    summary="Configure Target Asset Allocation Model",
)
async def set_target_allocations(
    portfolio_id: uuid.UUID,
    payload: SetTargetAllocationsRequest,
    session: AsyncSession = Depends(get_db_session),
) -> list[TargetAllocationResponse]:
    """Sets desired percentage weighting across macro asset classes (must sum to exactly 100%)."""
    try:
        targets = await drift_service.set_target_allocations(
            session=session,
            portfolio_id=portfolio_id,
            items=payload.allocations,
        )
        await session.commit()
        return [
            TargetAllocationResponse(
                id=t.id,
                portfolio_id=t.portfolio_id,
                asset_class=t.asset_class,
                target_percentage=t.target_percentage,
                rebalance_threshold_pct=t.rebalance_threshold_pct,
            )
            for t in targets
        ]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set target allocations: {str(exc)}",
        )


@router.get(
    "/{portfolio_id}/targets",
    response_model=list[TargetAllocationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Configured Target Allocations",
)
async def get_target_allocations(
    portfolio_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[TargetAllocationResponse]:
    """Retrieves configured target allocations and drift thresholds for a portfolio."""
    targets = await drift_service.get_target_allocations(session, portfolio_id)
    return [
        TargetAllocationResponse(
            id=t.id,
            portfolio_id=t.portfolio_id,
            asset_class=t.asset_class,
            target_percentage=t.target_percentage,
            rebalance_threshold_pct=t.rebalance_threshold_pct,
        )
        for t in targets
    ]


@router.get(
    "/{portfolio_id}/drift",
    response_model=PortfolioDriftResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate Multi-Currency Portfolio Drift",
)
async def get_portfolio_drift(
    portfolio_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PortfolioDriftResponse:
    """Computes real-time asset class drift across consolidated Indian and US holdings."""
    try:
        return await drift_service.calculate_portfolio_drift(session, portfolio_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drift calculation failed: {str(exc)}",
        )


@router.post(
    "/{portfolio_id}/rebalance",
    response_model=RebalancePlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Portfolio Rebalancing Plan",
)
async def generate_rebalance_plan(
    portfolio_id: uuid.UUID,
    payload: RebalancePlanRequest = RebalancePlanRequest(),
    session: AsyncSession = Depends(get_db_session),
) -> RebalancePlanResponse:
    """
    Generates actionable buy/sell orders.
    If fresh capital is supplied, executes tax-optimized buy-only rebalancing.
    """
    try:
        return await drift_service.generate_rebalance_plan(
            session=session,
            portfolio_id=portfolio_id,
            cash_inflow_inr=payload.cash_inflow_inr,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rebalance planning failed: {str(exc)}",
        )
