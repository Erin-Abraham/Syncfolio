from decimal import Decimal
import uuid
from pydantic import BaseModel, Field
from app.models.enums import AssetClass, AssetType, CurrencyCode


class HoldingResponse(BaseModel):
    """Point-in-time holding valuation and performance DTO."""
    id: uuid.UUID
    account_id: uuid.UUID
    asset_id: uuid.UUID
    symbol: str
    asset_name: str
    asset_class: AssetClass
    asset_type: AssetType
    quantity: Decimal
    average_buy_price: Decimal
    current_price: Decimal
    currency: CurrencyCode
    invested_value: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_percentage: Decimal


class ReconciliationSummaryResponse(BaseModel):
    """Summary metrics emitted following ledger reconciliation."""
    account_id: uuid.UUID
    total_transactions_processed: int
    distinct_assets_reconciled: int
    holdings_updated: int
    total_invested_value: Decimal
    currency: CurrencyCode
    status: str = "reconciled"
