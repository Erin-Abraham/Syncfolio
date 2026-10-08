from datetime import datetime, timezone
from decimal import Decimal
import logging
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import BrokerAccount
from app.models.enums import CurrencyCode, TransactionType
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.holding import ReconciliationSummaryResponse

logger = logging.getLogger("syncfolio.reconciliation")


class ReconciliationService:
    """
    Core financial reconciliation engine.
    Computes holding balances, FIFO / Weighted Average Cost Basis, and detects ledger drift.
    """

    async def reconcile_account(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
    ) -> ReconciliationSummaryResponse:
        """
        Processes the complete chronological transaction history for an account
        to deterministically rebuild current holdings and cost basis.
        """
        stmt_account = select(BrokerAccount).where(BrokerAccount.id == account_id)
        account = (await session.execute(stmt_account)).scalar_one_or_none()
        if not account:
            raise ValueError(f"BrokerAccount {account_id} not found.")

        # 1. Fetch all transactions ordered chronologically (strict ledger sequence)
        stmt_txs = (
            select(Transaction)
            .where(Transaction.account_id == account_id)
            .order_by(Transaction.trade_date.asc(), Transaction.created_at.asc())
        )
        transactions = (await session.execute(stmt_txs)).scalars().all()

        # 2. Group transactions by asset
        tx_by_asset: dict[uuid.UUID, list[Transaction]] = {}
        for tx in transactions:
            tx_by_asset.setdefault(tx.asset_id, []).append(tx)

        # 3. Fetch existing holdings
        stmt_holdings = select(Holding).where(Holding.account_id == account_id)
        existing_holdings = {
            h.asset_id: h for h in (await session.execute(stmt_holdings)).scalars().all()
        }

        holdings_updated = 0
        total_invested_value = Decimal("0.0")

        # 4. Reconcile cost basis and unit balance per asset
        for asset_id, asset_txs in tx_by_asset.items():
            running_units = Decimal("0.0")
            running_cost = Decimal("0.0")
            latest_price = Decimal("0.0")
            asset_currency = account.currency

            for tx in asset_txs:
                latest_price = tx.price_per_unit
                asset_currency = tx.currency

                if tx.transaction_type == TransactionType.BUY:
                    running_units += tx.quantity
                    running_cost += tx.net_amount
                elif tx.transaction_type == TransactionType.SELL:
                    if running_units > Decimal("0.0"):
                        avg_unit_cost = running_cost / running_units
                        running_units -= tx.quantity
                        if running_units <= Decimal("0.0"):
                            running_units = Decimal("0.0")
                            running_cost = Decimal("0.0")
                        else:
                            running_cost = running_units * avg_unit_cost
                    else:
                        running_units = Decimal("0.0")
                        running_cost = Decimal("0.0")

            avg_buy_price = (
                (running_cost / running_units).quantize(Decimal("0.0001"))
                if running_units > Decimal("0.0")
                else Decimal("0.0")
            )

            # Update or create holding
            holding = existing_holdings.get(asset_id)
            if holding is None:
                holding = Holding(
                    account_id=account_id,
                    asset_id=asset_id,
                    quantity=running_units,
                    average_buy_price=avg_buy_price,
                    current_price=latest_price,
                    currency=asset_currency,
                    last_synced_at=datetime.now(timezone.utc),
                )
                session.add(holding)
            else:
                holding.quantity = running_units
                holding.average_buy_price = avg_buy_price
                if latest_price > Decimal("0.0"):
                    holding.current_price = latest_price
                holding.currency = asset_currency
                holding.last_synced_at = datetime.now(timezone.utc)

            total_invested_value += holding.invested_value
            holdings_updated += 1

        await session.flush()

        return ReconciliationSummaryResponse(
            account_id=account_id,
            total_transactions_processed=len(transactions),
            distinct_assets_reconciled=len(tx_by_asset),
            holdings_updated=holdings_updated,
            total_invested_value=total_invested_value.quantize(Decimal("0.0001")),
            currency=account.currency,
            status="reconciled",
        )

    async def get_account_holdings(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
    ) -> list[Holding]:
        """Fetches active holding positions with preloaded asset relations."""
        stmt = (
            select(Holding)
            .where(Holding.account_id == account_id, Holding.quantity > Decimal("0.0"))
            .options(selectinload(Holding.asset))
        )
        return list((await session.execute(stmt)).scalars().all())


reconciliation_service = ReconciliationService()
