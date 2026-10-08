import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import uuid
import httpx
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.account import BrokerAccount
from app.models.enums import BrokerProvider, CurrencyCode
from app.models.user import Portfolio, User


async def run_phase2_verification() -> None:
    print("=" * 70)
    print("STARTING PHASE 2 END-TO-END VERIFICATION")
    print("=" * 70)

    base_url = "http://localhost:8000/api/v1"

    # Step 1: Create Test User, Portfolio, and Accounts directly in DB
    user_id = uuid.uuid4()
    portfolio_id = uuid.uuid4()
    zerodha_account_id = uuid.uuid4()
    cams_account_id = uuid.uuid4()
    drivewealth_account_id = uuid.uuid4()

    async with async_session_factory() as session:
        # Create User
        user = User(
            id=user_id,
            email=f"investor_{user_id.hex[:6]}@syncfolio.internal",
            full_name="Alpha Investor",
            is_active=True,
        )
        session.add(user)

        # Create Portfolio
        portfolio = Portfolio(
            id=portfolio_id,
            user_id=user_id,
            name="Global Multi-Asset Portfolio",
            description="Unified domestic mutual funds and US equities",
        )
        session.add(portfolio)

        # Create Accounts
        zerodha_acc = BrokerAccount(
            id=zerodha_account_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.ZERODHA,
            account_number="ZR12345",
            account_name="Zerodha Equity Account",
            currency=CurrencyCode.INR,
        )
        cams_acc = BrokerAccount(
            id=cams_account_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.CAMS,
            account_number="CAMS-FOLIO-9988",
            account_name="CAMS Mutual Fund Folios",
            currency=CurrencyCode.INR,
        )
        dw_acc = BrokerAccount(
            id=drivewealth_account_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.DRIVEWEALTH,
            account_number="DW-US-7788",
            account_name="DriveWealth US Equities",
            currency=CurrencyCode.USD,
        )
        session.add_all([zerodha_acc, cams_acc, dw_acc])
        await session.commit()

    print("[1] Provisioned test tenant, portfolio, and broker accounts in database.")

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Step 2: Test FX Seeding and Conversion
        seed_resp = await client.post("/fx/seed")
        assert seed_resp.status_code == 200, f"FX Seed failed: {seed_resp.text}"
        print(f"[2] FX Seed verified: {seed_resp.json()}")

        conv_resp = await client.get("/fx/convert?amount=1000&from_currency=USD&to_currency=INR")
        assert conv_resp.status_code == 200, f"FX Convert failed: {conv_resp.text}"
        conv_data = conv_resp.json()
        print(f"[3] FX Conversion verified: $1000 USD = Rs. {conv_data['converted_amount']} INR (Rate: {conv_data['exchange_rate']})")

        # Step 3: Test Zerodha Ingestion
        zerodha_payload = {
            "account_id": str(zerodha_account_id),
            "records": [
                {
                    "trade_id": "TRD-1001",
                    "order_id": "ORD-5001",
                    "symbol": "RELIANCE",
                    "isin": "INE002A01018",
                    "exchange": "NSE",
                    "segment": "EQ",
                    "trade_type": "buy",
                    "quantity": "25.00000000",
                    "price": "2850.5000",
                    "trade_date": datetime(2026, 1, 15, 10, 30, 0, tzinfo=timezone.utc).isoformat(),
                },
                {
                    "trade_id": "TRD-1002",
                    "order_id": "ORD-5002",
                    "symbol": "INFY",
                    "isin": "INE009A01021",
                    "exchange": "NSE",
                    "segment": "EQ",
                    "trade_type": "buy",
                    "quantity": "50.00000000",
                    "price": "1480.0000",
                    "trade_date": datetime(2026, 1, 20, 11, 0, 0, tzinfo=timezone.utc).isoformat(),
                },
            ],
        }
        z_resp = await client.post("/ingestion/zerodha", json=zerodha_payload)
        assert z_resp.status_code == 200, f"Zerodha ingestion failed: {z_resp.text}"
        z_data = z_resp.json()
        print(f"[4] Zerodha Ingestion: Inserted {z_data['inserted_records']}/{z_data['total_records']} trades.")
        assert z_data["inserted_records"] == 2

        # Step 4: Test CAMS Mutual Fund Ingestion
        cams_payload = {
            "account_id": str(cams_account_id),
            "records": [
                {
                    "folio_number": "FOL-101",
                    "scheme_name": "Parag Parikh Flexi Cap Fund Direct Growth",
                    "isin": "INF879O01019",
                    "trade_date": datetime(2026, 2, 5, 9, 0, 0, tzinfo=timezone.utc).isoformat(),
                    "transaction_type": "SIP Purchase",
                    "units": "153.25410000",
                    "nav": "65.2500",
                    "amount": "10000.0000",
                    "stt_tax": "0.0000",
                    "stamp_duty": "0.5000",
                },
                {
                    "folio_number": "FOL-102",
                    "scheme_name": "ICICI Prudential Liquid Fund Direct Growth",
                    "isin": "INF109K01157",
                    "trade_date": datetime(2026, 2, 10, 9, 0, 0, tzinfo=timezone.utc).isoformat(),
                    "transaction_type": "Purchase",
                    "units": "78.11200000",
                    "nav": "320.0500",
                    "amount": "25000.0000",
                    "stt_tax": "0.0000",
                    "stamp_duty": "1.2500",
                },
            ],
        }
        cams_resp = await client.post("/ingestion/cams", json=cams_payload)
        assert cams_resp.status_code == 200, f"CAMS ingestion failed: {cams_resp.text}"
        cams_data = cams_resp.json()
        print(f"[5] CAMS Ingestion: Inserted {cams_data['inserted_records']}/{cams_data['total_records']} MF units.")
        assert cams_data["inserted_records"] == 2

        # Step 5: Test DriveWealth US Equities Ingestion (8-decimal fractional lots)
        dw_payload = {
            "account_id": str(drivewealth_account_id),
            "records": [
                {
                    "order_id": "DW-ORD-901",
                    "symbol": "VOO",
                    "side": "BUY",
                    "shares": "2.41892145",
                    "price": "430.5000",
                    "gross_amount": "1041.3457",
                    "fees": "0.0200",
                    "net_amount": "1041.3657",
                    "trade_date": datetime(2026, 2, 12, 15, 30, 0, tzinfo=timezone.utc).isoformat(),
                },
                {
                    "order_id": "DW-ORD-902",
                    "symbol": "AAPL",
                    "side": "BUY",
                    "shares": "5.00000000",
                    "price": "180.2500",
                    "gross_amount": "901.2500",
                    "fees": "0.0100",
                    "net_amount": "901.2600",
                    "trade_date": datetime(2026, 2, 14, 15, 45, 0, tzinfo=timezone.utc).isoformat(),
                },
            ],
        }
        dw_resp = await client.post("/ingestion/drivewealth", json=dw_payload)
        assert dw_resp.status_code == 200, f"DriveWealth ingestion failed: {dw_resp.text}"
        dw_data = dw_resp.json()
        print(f"[6] DriveWealth Ingestion: Inserted {dw_data['inserted_records']}/{dw_data['total_records']} fractional lots.")
        assert dw_data["inserted_records"] == 2

        # Step 6: CRITICAL IDEMPOTENCY TEST (Re-ingest all identical payloads)
        print("[*] Re-ingesting identical payloads to verify SHA-256 deduplication idempotency...")
        re_z = await client.post("/ingestion/zerodha", json=zerodha_payload)
        assert re_z.json()["inserted_records"] == 0
        assert re_z.json()["duplicate_records_skipped"] == 2

        re_cams = await client.post("/ingestion/cams", json=cams_payload)
        assert re_cams.json()["inserted_records"] == 0
        assert re_cams.json()["duplicate_records_skipped"] == 2

        re_dw = await client.post("/ingestion/drivewealth", json=dw_payload)
        assert re_dw.json()["inserted_records"] == 0
        assert re_dw.json()["duplicate_records_skipped"] == 2
        print("[7] IDEMPOTENCY VERIFIED: 100% of duplicate transactions safely skipped!")

        # Step 7: Test Portfolio Reconciliation Engine
        print("[*] Running ledger reconciliation on all 3 accounts...")
        rec_z = await client.post(f"/reconciliation/accounts/{zerodha_account_id}")
        assert rec_z.status_code == 200
        print(f"[8] Reconciled Zerodha Account: {rec_z.json()}")

        rec_cams = await client.post(f"/reconciliation/accounts/{cams_account_id}")
        assert rec_cams.status_code == 200
        print(f"[9] Reconciled CAMS Account: {rec_cams.json()}")

        rec_dw = await client.post(f"/reconciliation/accounts/{drivewealth_account_id}")
        assert rec_dw.status_code == 200
        print(f"[10] Reconciled DriveWealth Account: {rec_dw.json()}")

        # Step 8: Fetch Reconciled Holdings
        holdings_dw = await client.get(f"/holdings/accounts/{drivewealth_account_id}")
        assert holdings_dw.status_code == 200
        holdings_data = holdings_dw.json()
        print(f"[11] Verified Reconciled US Holdings: {len(holdings_data)} positions found.")
        for h in holdings_data:
            print(f"     -> {h['symbol']} ({h['asset_class']}): {h['quantity']} units @ ${h['average_buy_price']} (Invested: ${h['invested_value']} {h['currency']})")

    print("=" * 70)
    print("PHASE 2 ALL 4 MILESTONES 100% VERIFIED!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_phase2_verification())
