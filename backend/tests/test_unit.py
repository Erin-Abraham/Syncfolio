from datetime import datetime, timezone
from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient

from app.models.enums import AssetClass, CurrencyCode
from app.schemas.drift import SetTargetAllocationsRequest, TargetAllocationItem
from app.services.deduplication import generate_transaction_hash
from app.services.fx import DEFAULT_FALLBACK_RATES


def test_deduplication_hash_determinism() -> None:
    """Verifies that identical financial transactions produce exact matching SHA-256 hashes."""
    account_id = uuid.uuid4()
    trade_date = datetime(2026, 3, 15, 10, 30, 45, tzinfo=timezone.utc)

    # Hashes must match even with differing Decimal scale representations (e.g. 10.0 vs 10.00000000)
    hash_1 = generate_transaction_hash(
        account_id=account_id,
        broker_reference_id="ORD-100",
        trade_date=trade_date,
        symbol="reliance",
        transaction_type="buy",
        quantity=Decimal("10.0"),
        amount=Decimal("25000.00"),
    )
    hash_2 = generate_transaction_hash(
        account_id=account_id,
        broker_reference_id="ORD-100",
        trade_date=trade_date,
        symbol="RELIANCE",
        transaction_type="BUY",
        quantity=Decimal("10.00000000"),
        amount=Decimal("25000.0"),
    )
    assert hash_1 == hash_2, "Hashes must be identical regardless of string casing or decimal trailing zeros"


def test_deduplication_hash_collision_resistance() -> None:
    """Verifies that differing transactions generate completely distinct hashes."""
    account_id = uuid.uuid4()
    trade_date = datetime(2026, 3, 15, 10, 30, 45, tzinfo=timezone.utc)

    hash_a = generate_transaction_hash(
        account_id=account_id,
        broker_reference_id="ORD-101",
        trade_date=trade_date,
        symbol="TCS",
        transaction_type="BUY",
        quantity=Decimal("10.0"),
        amount=Decimal("35000.0"),
    )
    hash_b = generate_transaction_hash(
        account_id=account_id,
        broker_reference_id="ORD-102",  # Different order ID
        trade_date=trade_date,
        symbol="TCS",
        transaction_type="BUY",
        quantity=Decimal("10.0"),
        amount=Decimal("35000.0"),
    )
    assert hash_a != hash_b


def test_target_allocation_validator_success() -> None:
    """Verifies that target allocations summing to exactly 100.00% pass validation."""
    req = SetTargetAllocationsRequest(
        allocations=[
            TargetAllocationItem(asset_class=AssetClass.DOMESTIC_EQUITY, target_percentage=Decimal("50.00")),
            TargetAllocationItem(asset_class=AssetClass.INTERNATIONAL_EQUITY, target_percentage=Decimal("30.00")),
            TargetAllocationItem(asset_class=AssetClass.DOMESTIC_DEBT, target_percentage=Decimal("20.00")),
        ]
    )
    assert len(req.allocations) == 3


def test_target_allocation_validator_failure() -> None:
    """Verifies that target allocations not summing to 100% fail validation."""
    with pytest.raises(ValueError, match="must sum to exactly 100.00%"):
        SetTargetAllocationsRequest(
            allocations=[
                TargetAllocationItem(asset_class=AssetClass.DOMESTIC_EQUITY, target_percentage=Decimal("40.00")),
                TargetAllocationItem(asset_class=AssetClass.DOMESTIC_DEBT, target_percentage=Decimal("40.00")),
            ]
        )


def test_target_allocation_duplicate_class_rejected() -> None:
    """Verifies that duplicate asset classes in target allocation are rejected."""
    with pytest.raises(ValueError, match="Duplicate asset classes"):
        SetTargetAllocationsRequest(
            allocations=[
                TargetAllocationItem(asset_class=AssetClass.DOMESTIC_EQUITY, target_percentage=Decimal("50.00")),
                TargetAllocationItem(asset_class=AssetClass.DOMESTIC_EQUITY, target_percentage=Decimal("50.00")),
            ]
        )


def test_fx_fallback_rates_integrity() -> None:
    """Verifies the fallback spot matrix exists and provides realistic rates."""
    usd_inr = DEFAULT_FALLBACK_RATES[(CurrencyCode.USD, CurrencyCode.INR)]
    inr_usd = DEFAULT_FALLBACK_RATES[(CurrencyCode.INR, CurrencyCode.USD)]
    assert usd_inr > Decimal("80.0")
    assert inr_usd < Decimal("0.02")


@pytest.mark.asyncio
async def test_api_health_live_endpoint(client: AsyncClient) -> None:
    """Verifies the process liveness probe endpoint."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_api_system_info_endpoint(client: AsyncClient) -> None:
    """Verifies system metadata endpoint exposes supported broker feeds."""
    response = await client.get("/api/v1/health/info")
    assert response.status_code == 200
    data = response.json()
    assert "ZERODHA" in data["supported_brokers"]
    assert "CAMS" in data["supported_brokers"]
    assert "DRIVEWEALTH" in data["supported_brokers"]
    assert "DOMESTIC_EQUITY" in data["supported_asset_classes"]
