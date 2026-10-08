from datetime import datetime
from decimal import Decimal
import hashlib
import uuid


def generate_transaction_hash(
    account_id: uuid.UUID,
    broker_reference_id: str | None,
    trade_date: datetime,
    symbol: str,
    transaction_type: str,
    quantity: Decimal,
    amount: Decimal,
) -> str:
    """
    Computes an immutable SHA-256 cryptographic fingerprint for a financial transaction.
    Guarantees strict ledger idempotency across repeated statement uploads or API syncs.
    """
    # Truncate to second precision to normalize timestamps across differing statement exports
    date_str = trade_date.strftime("%Y-%m-%d %H:%M:%S")
    # Normalize arbitrary Decimal representations to prevent string representation differences
    qty_str = f"{quantity.normalize():f}"
    amt_str = f"{amount.normalize():f}"
    ref_str = (broker_reference_id or "NONE").strip().upper()
    sym_str = symbol.strip().upper()
    type_str = transaction_type.strip().upper()

    fingerprint_raw = (
        f"{account_id}|{ref_str}|{date_str}|{sym_str}|{type_str}|{qty_str}|{amt_str}"
    )
    return hashlib.sha256(fingerprint_raw.encode("utf-8")).hexdigest()
