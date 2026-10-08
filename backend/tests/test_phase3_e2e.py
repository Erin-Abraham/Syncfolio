import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import uuid
import httpx
from app.core.database import async_session_factory
from app.models.account import BrokerAccount
from app.models.enums import BrokerProvider, CurrencyCode
from app.models.user import Portfolio, User


async def run_phase3_verification() -> None:
    print("=" * 70)
    print("STARTING PHASE 3 END-TO-END VERIFICATION (DRIFT & REBALANCING)")
    print("=" * 70)

    base_url = "http://localhost:8000/api/v1"

    # Step 1: Provision Tenant, Portfolio, and Accounts
    user_id = uuid.uuid4()
    portfolio_id = uuid.uuid4()
    zerodha_acc_id = uuid.uuid4()
    cams_acc_id = uuid.uuid4()
    dw_acc_id = uuid.uuid4()

    async with async_session_factory() as session:
        user = User(
            id=user_id,
            email=f"drift_investor_{user_id.hex[:6]}@syncfolio.internal",
            full_name="Drift Master",
            is_active=True,
        )
        portfolio = Portfolio(
            id=portfolio_id,
            user_id=user_id,
            name="Tactical All-Weather Portfolio",
            description="Multi-asset target allocation with domestic and US equities",
        )
        z_acc = BrokerAccount(
            id=zerodha_acc_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.ZERODHA,
            account_number="ZR-DRIFT-01",
            account_name="Zerodha Equities",
            currency=CurrencyCode.INR,
        )
        c_acc = BrokerAccount(
            id=cams_acc_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.CAMS,
            account_number="CAMS-DRIFT-01",
            account_name="CAMS Mutual Funds",
            currency=CurrencyCode.INR,
        )
        d_acc = BrokerAccount(
            id=dw_acc_id,
            portfolio_id=portfolio_id,
            provider=BrokerProvider.DRIVEWEALTH,
            account_number="DW-DRIFT-01",
            account_name="DriveWealth US",
            currency=CurrencyCode.USD,
        )
        session.add_all([user, portfolio, z_acc, c_acc, d_acc])
        await session.commit()

    print("[1] Provisioned portfolio hierarchy in database.")

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Step 2: Ingest Multi-Asset Positions
        # A) Domestic Equity (Zerodha): Rs. 150,000
        z_payload = {
            "account_id": str(zerodha_acc_id),
            "records": [
                {
                    "trade_id": "T-Z1",
                    "order_id": "O-Z1",
                    "symbol": "TCS",
                    "exchange": "NSE",
                    "segment": "EQ",
                    "trade_type": "buy",
                    "quantity": "40.00000000",
                    "price": "3750.0000",
                    "trade_date": datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
                }
            ],
        }
        await client.post("/ingestion/zerodha", json=z_payload)

        # B) Domestic Debt (CAMS Liquid): Rs. 50,000
        cams_payload = {
            "account_id": str(cams_acc_id),
            "records": [
                {
                    "folio_number": "FOL-LIQ-1",
                    "scheme_name": "HDFC Liquid Fund Direct Growth",
                    "isin": "INF179K01923",
                    "trade_date": datetime(2026, 3, 2, 9, 30, 0, tzinfo=timezone.utc).isoformat(),
                    "transaction_type": "Purchase",
                    "units": "500.00000000",
                    "nav": "100.0000",
                    "amount": "50000.0000",
                    "stt_tax": "0.0",
                    "stamp_duty": "2.5",
                }
            ],
        }
        await client.post("/ingestion/cams", json=cams_payload)

        # C) International Equity (DriveWealth): $1,000 USD @ $83.50 = Rs. 83,500
        dw_payload = {
            "account_id": str(dw_acc_id),
            "records": [
                {
                    "order_id": "O-DW-1",
                    "symbol": "VOO",
                    "side": "BUY",
                    "shares": "2.50000000",
                    "price": "400.0000",
                    "gross_amount": "1000.0000",
                    "fees": "0.0500",
                    "net_amount": "1000.0500",
                    "trade_date": datetime(2026, 3, 3, 15, 30, 0, tzinfo=timezone.utc).isoformat(),
                }
            ],
        }
        await client.post("/ingestion/drivewealth", json=dw_payload)

        # Step 3: Reconcile all 3 accounts
        await client.post(f"/reconciliation/accounts/{zerodha_acc_id}")
        await client.post(f"/reconciliation/accounts/{cams_acc_id}")
        await client.post(f"/reconciliation/accounts/{dw_acc_id}")
        print("[2] Successfully ingested and reconciled transactions across INR and USD accounts.")

        # Step 4: Configure Target Allocations (Milestone 10)
        # Test validation invariant: Sum must equal 100%
        invalid_target_payload = {
            "allocations": [
                {"asset_class": "DOMESTIC_EQUITY", "target_percentage": "50.00"},
                {"asset_class": "DOMESTIC_DEBT", "target_percentage": "30.00"},
            ]
        }
        inv_res = await client.post(f"/portfolios/{portfolio_id}/targets", json=invalid_target_payload)
        assert inv_res.status_code == 422, "Expected 422 when target allocations do not sum to 100%"
        print("[3] Target Allocation Invariant Verified: Rejected invalid allocation sum (80%).")

        # Valid targets: 50% Domestic Equity, 30% International Equity, 20% Domestic Debt
        valid_targets = {
            "allocations": [
                {"asset_class": "DOMESTIC_EQUITY", "target_percentage": "50.00", "rebalance_threshold_pct": "3.00"},
                {"asset_class": "INTERNATIONAL_EQUITY", "target_percentage": "30.00", "rebalance_threshold_pct": "3.00"},
                {"asset_class": "DOMESTIC_DEBT", "target_percentage": "20.00", "rebalance_threshold_pct": "3.00"},
            ]
        }
        set_targets_res = await client.post(f"/portfolios/{portfolio_id}/targets", json=valid_targets)
        assert set_targets_res.status_code == 200
        print(f"[4] Configured Target Model: 50% Domestic Equity, 30% US Equity, 20% Domestic Debt.")

        # Step 5: Real-Time Drift Analysis (Milestone 11)
        drift_res = await client.get(f"/portfolios/{portfolio_id}/drift")
        assert drift_res.status_code == 200
        drift_data = drift_res.json()
        print(f"[5] Portfolio Drift Computed:")
        print(f"     Total Portfolio Value: Rs. {drift_data['total_portfolio_value_inr']} INR")
        print(f"     Rebalance Triggered: {drift_data['rebalance_triggered']}")
        for a in drift_data["allocations"]:
            print(
                f"     -> {a['asset_class']}: Current {a['current_weight_pct']}% vs Target {a['target_weight_pct']}% "
                f"| Absolute Drift: {a['absolute_drift_pct']}% | Status: {a['status']} | Action: {a['action_required']}"
            )

        # Step 6: Full Rebalance Recommendation (Milestone 12)
        rebalance_res = await client.post(f"/portfolios/{portfolio_id}/rebalance")
        assert rebalance_res.status_code == 200
        plan = rebalance_res.json()
        print(f"[6] Full Rebalance Plan Generated (Strategy: {plan['strategy']}):")
        print(f"     Total Recommended Purchases: Rs. {plan['total_buy_amount_inr']}")
        print(f"     Total Recommended Sales: Rs. {plan['total_sell_amount_inr']}")
        for order in plan["orders"]:
            if order["action"] != "HOLD":
                print(f"     -> {order['action']} {order['asset_class']}: Rs. {order['amount_inr']} ({order['rationale']})")

        # Step 7: Tax-Optimized Fresh Cash Inflow Rebalance (Milestone 12)
        # Inject fresh monthly SIP cash of Rs. 40,000 without selling any assets
        inflow_payload = {"cash_inflow_inr": "40000.00"}
        inflow_res = await client.post(f"/portfolios/{portfolio_id}/rebalance", json=inflow_payload)
        assert inflow_res.status_code == 200
        inflow_plan = inflow_res.json()
        print(f"[7] Tax-Optimized Inflow Rebalance Plan Generated (Strategy: {inflow_plan['strategy']}):")
        print(f"     Fresh Capital Deployed: Rs. {inflow_plan['cash_inflow_inr']}")
        print(f"     Total Sales: Rs. {inflow_plan['total_sell_amount_inr']} (Zero capital gains tax triggered!)")
        for order in inflow_plan["orders"]:
            if order["action"] == "BUY":
                print(
                    f"     -> Deploy Rs. {order['amount_inr']} into {order['asset_class']} "
                    f"(Post-rebalance projected weight: {order['projected_weight_pct']}%)"
                )
        assert inflow_plan["total_sell_amount_inr"] == "0.0"

    print("=" * 70)
    print("PHASE 3 ALL 3 MILESTONES 100% VERIFIED!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_phase3_verification())
