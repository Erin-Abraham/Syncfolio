from datetime import datetime, timezone
from decimal import Decimal
import logging
import uuid
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import BrokerAccount
from app.models.allocation import TargetAllocation
from app.models.enums import AssetClass, CurrencyCode
from app.models.holding import Holding
from app.models.user import Portfolio
from app.schemas.drift import (
    AssetClassDrift,
    PortfolioDriftResponse,
    RebalanceOrderRecommendation,
    RebalancePlanResponse,
    TargetAllocationItem,
)
from app.services.fx import fx_service

logger = logging.getLogger("syncfolio.drift")


class DriftService:
    """
    Mathematical portfolio drift detection and rebalancing recommendation engine.
    Normalizes multi-currency assets to compute allocation deviation and generates
    tax-efficient order rebalancing plans.
    """

    async def set_target_allocations(
        self,
        session: AsyncSession,
        portfolio_id: uuid.UUID,
        items: list[TargetAllocationItem],
    ) -> list[TargetAllocation]:
        """Saves or overrides the target allocation model for a portfolio."""
        stmt_port = select(Portfolio).where(Portfolio.id == portfolio_id)
        portfolio = (await session.execute(stmt_port)).scalar_one_or_none()
        if not portfolio:
            raise ValueError(f"Portfolio {portfolio_id} not found.")

        # Delete existing target allocations for clean override
        await session.execute(
            delete(TargetAllocation).where(TargetAllocation.portfolio_id == portfolio_id)
        )

        entities: list[TargetAllocation] = []
        for item in items:
            entity = TargetAllocation(
                portfolio_id=portfolio_id,
                asset_class=item.asset_class,
                target_percentage=item.target_percentage,
                rebalance_threshold_pct=item.rebalance_threshold_pct,
            )
            session.add(entity)
            entities.append(entity)

        await session.flush()
        return entities

    async def get_target_allocations(
        self,
        session: AsyncSession,
        portfolio_id: uuid.UUID,
    ) -> list[TargetAllocation]:
        """Fetches active target allocation targets for a portfolio."""
        stmt = (
            select(TargetAllocation)
            .where(TargetAllocation.portfolio_id == portfolio_id)
            .order_by(TargetAllocation.target_percentage.desc())
        )
        return list((await session.execute(stmt)).scalars().all())

    async def calculate_portfolio_drift(
        self,
        session: AsyncSession,
        portfolio_id: uuid.UUID,
    ) -> PortfolioDriftResponse:
        """
        Computes real-time multi-currency drift metrics across domestic and US holdings.
        """
        stmt_port = select(Portfolio).where(Portfolio.id == portfolio_id)
        portfolio = (await session.execute(stmt_port)).scalar_one_or_none()
        if not portfolio:
            raise ValueError(f"Portfolio {portfolio_id} not found.")

        # 1. Fetch Target Allocations
        targets = await self.get_target_allocations(session, portfolio_id)
        if not targets:
            raise ValueError(
                f"Portfolio {portfolio_id} has no target allocation model configured."
            )

        # 2. Fetch all holdings across all linked broker accounts
        stmt_holdings = (
            select(Holding)
            .join(BrokerAccount, Holding.account_id == BrokerAccount.id)
            .where(
                BrokerAccount.portfolio_id == portfolio_id,
                Holding.quantity > Decimal("0.0"),
            )
            .options(selectinload(Holding.asset))
        )
        holdings = list((await session.execute(stmt_holdings)).scalars().all())

        # 3. Aggregate current valuations normalized to INR
        class_valuations_inr: dict[AssetClass, Decimal] = {
            t.asset_class: Decimal("0.0") for t in targets
        }
        total_portfolio_value_inr = Decimal("0.0")

        for h in holdings:
            holding_market_val = h.current_value
            if h.currency == CurrencyCode.USD:
                holding_val_inr = await fx_service.convert(
                    session,
                    holding_market_val,
                    CurrencyCode.USD,
                    CurrencyCode.INR,
                )
            else:
                holding_val_inr = holding_market_val

            a_class = h.asset.asset_class
            class_valuations_inr[a_class] = (
                class_valuations_inr.get(a_class, Decimal("0.0")) + holding_val_inr
            )
            total_portfolio_value_inr += holding_val_inr

        # 4. Compute drift metrics per asset class
        drift_results: list[AssetClassDrift] = []
        rebalance_triggered = False

        for target in targets:
            current_val = class_valuations_inr.get(target.asset_class, Decimal("0.0"))
            current_weight = (
                ((current_val / total_portfolio_value_inr) * Decimal("100.0")).quantize(
                    Decimal("0.01")
                )
                if total_portfolio_value_inr > Decimal("0.0")
                else Decimal("0.0")
            )

            target_weight = target.target_percentage
            abs_drift = (current_weight - target_weight).quantize(Decimal("0.01"))
            rel_drift = (
                (((abs_drift) / target_weight) * Decimal("100.0")).quantize(Decimal("0.01"))
                if target_weight > Decimal("0.0")
                else Decimal("0.0")
            )
            threshold = target.rebalance_threshold_pct

            # Determine drift status and action
            if abs_drift > threshold:
                status = "OVERWEIGHT"
                action = "SELL"
                rebalance_triggered = True
            elif abs_drift < -threshold:
                status = "UNDERWEIGHT"
                action = "BUY"
                rebalance_triggered = True
            else:
                status = "BALANCED"
                action = "HOLD"

            # Recommended rebalancing trade amount: (W_target - W_current) * V_total
            rebalance_amount = (
                ((target_weight - current_weight) / Decimal("100.0"))
                * total_portfolio_value_inr
            ).quantize(Decimal("0.0001"))

            drift_results.append(
                AssetClassDrift(
                    asset_class=target.asset_class,
                    current_value_inr=current_val.quantize(Decimal("0.0001")),
                    current_weight_pct=current_weight,
                    target_weight_pct=target_weight,
                    absolute_drift_pct=abs_drift,
                    relative_drift_pct=rel_drift,
                    threshold_pct=threshold,
                    status=status,
                    action_required=action,
                    recommended_rebalance_amount_inr=rebalance_amount,
                )
            )

        return PortfolioDriftResponse(
            portfolio_id=portfolio_id,
            portfolio_name=portfolio.name,
            reporting_currency=CurrencyCode.INR,
            total_portfolio_value_inr=total_portfolio_value_inr.quantize(Decimal("0.0001")),
            rebalance_triggered=rebalance_triggered,
            allocations=drift_results,
            calculated_at=datetime.now(timezone.utc),
        )

    async def generate_rebalance_plan(
        self,
        session: AsyncSession,
        portfolio_id: uuid.UUID,
        cash_inflow_inr: Decimal = Decimal("0.0"),
    ) -> RebalancePlanResponse:
        """
        Generates actionable rebalance recommendations.
        If fresh capital is supplied, executes tax-optimized buy-only reallocation.
        """
        drift = await self.calculate_portfolio_drift(session, portfolio_id)
        current_total = drift.total_portfolio_value_inr
        orders: list[RebalanceOrderRecommendation] = []

        total_buy = Decimal("0.0")
        total_sell = Decimal("0.0")

        if cash_inflow_inr > Decimal("0.0"):
            # Tax-Optimized Inflow Mode: Allocates cash exclusively to underweight classes
            strategy = "CASH_INFLOW_OPTIMIZED"
            projected_total = current_total + cash_inflow_inr

            # Calculate monetary shortfall against projected target value
            shortfalls: dict[AssetClass, Decimal] = {}
            for item in drift.allocations:
                ideal_val = (item.target_weight_pct / Decimal("100.0")) * projected_total
                shortfall = max(Decimal("0.0"), ideal_val - item.current_value_inr)
                if shortfall > Decimal("0.0"):
                    shortfalls[item.asset_class] = shortfall

            total_shortfall = sum(shortfalls.values())

            for item in drift.allocations:
                if item.asset_class in shortfalls and total_shortfall > Decimal("0.0"):
                    # Distribute available cash proportionally to shortfall
                    ratio = shortfalls[item.asset_class] / total_shortfall
                    allocated_cash = (cash_inflow_inr * ratio).quantize(Decimal("0.0001"))
                    projected_val = item.current_value_inr + allocated_cash
                    projected_wt = (
                        (projected_val / projected_total) * Decimal("100.0")
                    ).quantize(Decimal("0.01"))

                    orders.append(
                        RebalanceOrderRecommendation(
                            asset_class=item.asset_class,
                            action="BUY",
                            amount_inr=allocated_cash,
                            target_weight_pct=item.target_weight_pct,
                            current_weight_pct=item.current_weight_pct,
                            projected_weight_pct=projected_wt,
                            rationale=(
                                f"Inflow allocation: Underweight by {abs(item.absolute_drift_pct)}%. "
                                f"Deploying Rs. {allocated_cash} to restore target."
                            ),
                        )
                    )
                    total_buy += allocated_cash
                else:
                    # Overweight or balanced classes receive Rs 0 fresh cash and NO sales
                    projected_wt = (
                        (item.current_value_inr / projected_total) * Decimal("100.0")
                    ).quantize(Decimal("0.01"))
                    orders.append(
                        RebalanceOrderRecommendation(
                            asset_class=item.asset_class,
                            action="HOLD",
                            amount_inr=Decimal("0.0"),
                            target_weight_pct=item.target_weight_pct,
                            current_weight_pct=item.current_weight_pct,
                            projected_weight_pct=projected_wt,
                            rationale="Position maintained; dilution via fresh cash reduces overweight.",
                        )
                    )
        else:
            # Full Rebalance Mode: Sell overweight and buy underweight
            strategy = "FULL_REBALANCE"
            projected_total = current_total

            for item in drift.allocations:
                if item.status == "UNDERWEIGHT":
                    buy_amt = abs(item.recommended_rebalance_amount_inr)
                    orders.append(
                        RebalanceOrderRecommendation(
                            asset_class=item.asset_class,
                            action="BUY",
                            amount_inr=buy_amt,
                            target_weight_pct=item.target_weight_pct,
                            current_weight_pct=item.current_weight_pct,
                            projected_weight_pct=item.target_weight_pct,
                            rationale=f"Underweight by {abs(item.absolute_drift_pct)}%. Purchasing to restore target.",
                        )
                    )
                    total_buy += buy_amt
                elif item.status == "OVERWEIGHT":
                    sell_amt = abs(item.recommended_rebalance_amount_inr)
                    orders.append(
                        RebalanceOrderRecommendation(
                            asset_class=item.asset_class,
                            action="SELL",
                            amount_inr=sell_amt,
                            target_weight_pct=item.target_weight_pct,
                            current_weight_pct=item.current_weight_pct,
                            projected_weight_pct=item.target_weight_pct,
                            rationale=f"Overweight by {item.absolute_drift_pct}%. Trimming to restore target.",
                        )
                    )
                    total_sell += sell_amt
                else:
                    orders.append(
                        RebalanceOrderRecommendation(
                            asset_class=item.asset_class,
                            action="HOLD",
                            amount_inr=Decimal("0.0"),
                            target_weight_pct=item.target_weight_pct,
                            current_weight_pct=item.current_weight_pct,
                            projected_weight_pct=item.current_weight_pct,
                            rationale="Asset class within tolerance threshold.",
                        )
                    )

        return RebalancePlanResponse(
            portfolio_id=portfolio_id,
            strategy=strategy,
            current_portfolio_value_inr=current_total,
            cash_inflow_inr=cash_inflow_inr,
            projected_portfolio_value_inr=projected_total,
            orders=orders,
            total_buy_amount_inr=total_buy,
            total_sell_amount_inr=total_sell,
        )


drift_service = DriftService()
