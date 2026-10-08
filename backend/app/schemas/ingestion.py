from datetime import datetime
from decimal import Decimal
import uuid
from pydantic import BaseModel, Field
from app.models.enums import AssetClass, AssetType, CurrencyCode, TransactionType


class CamsTransactionDTO(BaseModel):
    """Raw record structure from CAMS / KFintech CAS mutual fund statement."""
    folio_number: str = Field(..., description="Investor mutual fund folio number")
    scheme_name: str = Field(..., description="Full mutual fund scheme title")
    isin: str = Field(..., min_length=12, max_length=12, description="Scheme ISIN code")
    trade_date: datetime = Field(..., description="Execution date of the order/SIP")
    transaction_type: str = Field(..., description="Raw transaction description (Purchase, SIP, Switch, Redemption)")
    units: Decimal = Field(..., gt=0, description="Quantity of mutual fund units allotted or redeemed")
    nav: Decimal = Field(..., gt=0, description="Net Asset Value per unit on trade date")
    amount: Decimal = Field(..., gt=0, description="Gross transactional value in INR")
    stt_tax: Decimal = Field(default=Decimal("0.0"), description="Securities Transaction Tax paid")
    stamp_duty: Decimal = Field(default=Decimal("0.0"), description="Stamp duty applied")


class ZerodhaTradeDTO(BaseModel):
    """Raw execution record from Zerodha Tradebook export."""
    trade_id: str = Field(..., description="Unique exchange trade identifier")
    order_id: str = Field(..., description="Broker order reference identifier")
    symbol: str = Field(..., description="NSE/BSE trading symbol")
    isin: str | None = Field(default=None, description="Security ISIN if present")
    exchange: str = Field(default="NSE", description="Exchange venue (NSE, BSE)")
    segment: str = Field(default="EQ", description="Market segment")
    trade_type: str = Field(..., description="Order side: 'buy' or 'sell'")
    quantity: Decimal = Field(..., gt=0, description="Traded quantity")
    price: Decimal = Field(..., gt=0, description="Executed price in INR")
    trade_date: datetime = Field(..., description="Timestamp of execution")


class DriveWealthTradeDTO(BaseModel):
    """Raw transaction record from DriveWealth / INDmoney US equities."""
    order_id: str = Field(..., description="DriveWealth order ID")
    symbol: str = Field(..., description="US Equity/ETF ticker symbol (e.g. AAPL, VOO)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    shares: Decimal = Field(..., gt=0, description="Fractional or whole share quantity (up to 8 decimals)")
    price: Decimal = Field(..., gt=0, description="Execution price per share in USD")
    gross_amount: Decimal = Field(..., gt=0, description="Gross total in USD")
    fees: Decimal = Field(default=Decimal("0.0"), ge=0, description="SEC, FINRA, or broker fees in USD")
    net_amount: Decimal = Field(..., gt=0, description="Net debited or credited USD amount")
    trade_date: datetime = Field(..., description="Order execution timestamp")
    settlement_date: datetime | None = Field(default=None, description="T+1 or T+2 settlement date")


class CanonicalTransactionDTO(BaseModel):
    """Unified normalized transaction representation across all broker platforms."""
    symbol: str
    name: str
    isin: str | None = None
    cusip: str | None = None
    exchange: str | None = None
    asset_type: AssetType
    asset_class: AssetClass
    transaction_type: TransactionType
    quantity: Decimal
    price_per_unit: Decimal
    gross_amount: Decimal
    net_amount: Decimal
    fees: Decimal
    currency: CurrencyCode
    trade_date: datetime
    settlement_date: datetime | None = None
    broker_reference_id: str | None = None
    deduplication_hash: str


class CamsIngestionRequest(BaseModel):
    account_id: uuid.UUID = Field(..., description="Target broker account UUID")
    records: list[CamsTransactionDTO]


class ZerodhaIngestionRequest(BaseModel):
    account_id: uuid.UUID = Field(..., description="Target broker account UUID")
    records: list[ZerodhaTradeDTO]


class DriveWealthIngestionRequest(BaseModel):
    account_id: uuid.UUID = Field(..., description="Target broker account UUID")
    records: list[DriveWealthTradeDTO]


class IngestionResultResponse(BaseModel):
    account_id: uuid.UUID
    provider: str
    total_records: int
    inserted_records: int
    duplicate_records_skipped: int
    errors: list[str] = Field(default_factory=list)
