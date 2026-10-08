from enum import Enum


class BrokerProvider(str, Enum):
    """Supported broker, aggregator, and depository platforms."""
    ZERODHA = "ZERODHA"
    CAMS = "CAMS"
    INDMONEY = "INDMONEY"
    DRIVEWEALTH = "DRIVEWEALTH"
    MANUAL = "MANUAL"


class AssetClass(str, Enum):
    """Macro asset classes utilized for portfolio drift calculation."""
    DOMESTIC_EQUITY = "DOMESTIC_EQUITY"
    INTERNATIONAL_EQUITY = "INTERNATIONAL_EQUITY"
    DOMESTIC_DEBT = "DOMESTIC_DEBT"
    COMMODITY = "COMMODITY"
    CASH_EQUIVALENT = "CASH_EQUIVALENT"


class AssetType(str, Enum):
    """Granular instrument classification."""
    EQUITY_IN = "EQUITY_IN"
    MUTUAL_FUND_IN = "MUTUAL_FUND_IN"
    EQUITY_US = "EQUITY_US"
    ETF_US = "ETF_US"
    CASH = "CASH"


class TransactionType(str, Enum):
    """Atomic ledger action category."""
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    FEE = "FEE"
    SPLIT = "SPLIT"


class CurrencyCode(str, Enum):
    """Standard ISO 4217 currency identifiers."""
    INR = "INR"
    USD = "USD"
