import asyncio
from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient

from app.core.database import async_session_factory
from app.models.account import BrokerAccount
from app.models.enums import BrokerProvider, CurrencyCode
from app.models.holding import Holding
from app.models.job import JobStatus
from app.models.user import Portfolio, User
from sqlalchemy import select


@pytest.mark.asyncio
async def test_async_job_ingestion_and_reconciliation(client: AsyncClient) -> None:
    """
    Verifies asynchronous task enqueuing, background execution,
    and automatic ledger reconciliation.
    """
    user_id = uuid.uuid4()
    portfolio_id = uuid.uuid4()
    account_id = uuid.uuid4()

    # 1. Provision Account
    async with async_session_factory() as session:
        user = User(
            id=user_id,
            email=f"async_job_user_{user_id.hex[:6]}@syncfolio.internal",
            full_name="Async Tester",
            is_active=True,
        )
        portfolio = Portfolio(
            id=portfolio_id,
            user_id=user_id,
            name="Async Test Portfolio",
        )
        account = BrokerAccount(
            id=account_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.ZERODHA,
            account_number="ZR-ASYNC-99",
            account_name="Zerodha Async",
            currency=CurrencyCode.INR,
        )
        session.add_all([user, portfolio, account])
        await session.commit()

    # 2. Enqueue Ingestion Job via API
    payload = {
        "account_id": str(account_id),
        "records": [
            {
                "trade_id": f"TRD-ASYNC-{uuid.uuid4().hex[:6]}",
                "order_id": "ORD-A1",
                "symbol": "WIPRO",
                "exchange": "NSE",
                "segment": "EQ",
                "trade_type": "buy",
                "quantity": "100.00000000",
                "price": "450.0000",
                "trade_date": datetime(2026, 3, 10, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
            }
        ],
    }

    response = await client.post("/api/v1/jobs/ingest/zerodha", json=payload)
    assert response.status_code == 202
    job_data = response.json()
    job_id = job_data["job_id"]
    assert job_data["status"] == JobStatus.PENDING.value
    assert job_data["total_records"] == 1

    # 3. Poll Job status until COMPLETED
    max_retries = 10
    final_status = None
    for _ in range(max_retries):
        await asyncio.sleep(0.5)
        poll_res = await client.get(f"/api/v1/jobs/{job_id}")
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        if poll_data["status"] == JobStatus.COMPLETED.value:
            final_status = poll_data
            break

    assert final_status is not None, "Job did not complete within timeout"
    assert final_status["inserted_records"] == 1
    assert final_status["error_message"] is None

    # 4. Verify Holding was automatically reconciled in database
    async with async_session_factory() as session:
        stmt = select(Holding).where(Holding.account_id == account_id)
        holdings = list((await session.execute(stmt)).scalars().all())
        assert len(holdings) == 1
        assert holdings[0].quantity == 100
        assert holdings[0].average_buy_price == 450
