from datetime import datetime, timezone
from decimal import Decimal
import uuid
from pydantic import BaseModel, Field, model_validator
from app.models.enums import AssetClass, CurrencyCode


class TargetAllocationItem(BaseModel):
    asset_class: AssetClass
    target_percentage: Decimal = Field(..., gt=0, le=100, description="Target allocation % (0.01 to 100.00)")
    rebalance_threshold_pct: Decimal = Field(
        default=Decimal("5.00"),
        gt=0,
        le=50,
        description="Allowed drift tolerance band % before rebalance is triggered",
    )


class SetTargetAllocationsRequest(BaseModel):
    allocations: list[TargetAllocationItem]

    @model_validator(mode="after")
    def validate_sum_equals_hundred(self) -> "SetTargetAllocationsRequest":
        total = sum(item.target_percentage for item in self.allocations)
        if abs(total - Decimal("100.00")) > Decimal("0.01"):
            raise ValueError(
                f"Target allocations must sum to exactly 100.00%. Current sum: {total}%"
            )
        # Ensure no duplicate asset classes
        classes = [item.asset_class for item in self.allocations]
        if len(classes) != len(set(classes)):
            raise ValueError("Duplicate asset classes specified in target allocation model.")
        return self


class TargetAllocationResponse(BaseModel):
    id: uuid.UUID
    portfolio_id: uuid.UUID
    asset_class: AssetClass
    target_percentage: Decimal
    rebalance_threshold_pct: Decimal


class AssetClassDrift(BaseModel):
    asset_class: AssetClass
    current_value_inr: Decimal
    current_weight_pct: Decimal
    target_weight_pct: Decimal
    absolute_drift_pct: Decimal
    relative_drift_pct: Decimal
    threshold_pct: Decimal
    status: str = Field(..., description="'BALANCED', 'OVERWEIGHT', or 'UNDERWEIGHT'")
    action_required: str = Field(..., description="'HOLD', 'BUY', or 'SELL'")
    recommended_rebalance_amount_inr: Decimal


class PortfolioDriftResponse(BaseModel):
    portfolio_id: uuid.UUID
    portfolio_name: str
    reporting_currency: CurrencyCode = CurrencyCode.INR
    total_portfolio_value_inr: Decimal
    rebalance_triggered: bool
    allocations: list[AssetClassDrift]
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RebalanceOrderRecommendation(BaseModel):
    asset_class: AssetClass
    action: str = Field(..., description="'BUY' or 'SELL'")
    amount_inr: Decimal
    target_weight_pct: Decimal
    current_weight_pct: Decimal
    projected_weight_pct: Decimal
    rationale: str


class RebalancePlanRequest(BaseModel):
    cash_inflow_inr: Decimal = Field(
        default=Decimal("0.0"),
        ge=0,
        description="Optional fresh capital deposit to execute tax-optimized buy-only rebalance",
    )


class RebalancePlanResponse(BaseModel):
    portfolio_id: uuid.UUID
    strategy: str = Field(..., description="'FULL_REBALANCE' or 'CASH_INFLOW_OPTIMIZED'")
    current_portfolio_value_inr: Decimal
    cash_inflow_inr: Decimal
    projected_portfolio_value_inr: Decimal
    orders: list[RebalanceOrderRecommendation]
    total_buy_amount_inr: Decimal
    total_sell_amount_inr: Decimal
