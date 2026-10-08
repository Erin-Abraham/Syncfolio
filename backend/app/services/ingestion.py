from decimal import Decimal
import logging
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import BrokerAccount
from app.models.asset import Asset
from app.models.enums import (
    AssetClass,
    AssetType,
    CurrencyCode,
    TransactionType,
)
from app.models.transaction import Transaction
from app.schemas.ingestion import (
    CamsTransactionDTO,
    DriveWealthTradeDTO,
    IngestionResultResponse,
    ZerodhaTradeDTO,
)
from app.services.deduplication import generate_transaction_hash

logger = logging.getLogger("syncfolio.ingestion")


class IngestionService:
    """
    Normalizes multi-broker transaction feeds into canonical records.
    Enforces strict cryptographic deduplication and transactional ACID safety.
    """

    async def _verify_account_exists(
        self, session: AsyncSession, account_id: uuid.UUID
    ) -> BrokerAccount:
        stmt = select(BrokerAccount).where(BrokerAccount.id == account_id)
        account = (await session.execute(stmt)).scalar_one_or_none()
        if not account:
            raise ValueError(f"BrokerAccount with ID {account_id} does not exist.")
        return account

    async def _get_or_create_asset(
        self,
        session: AsyncSession,
        symbol: str,
        name: str,
        currency: CurrencyCode,
        asset_type: AssetType,
        asset_class: AssetClass,
        isin: str | None = None,
        exchange: str | None = None,
    ) -> Asset:
        # Match primarily on symbol and currency
        stmt = select(Asset).where(Asset.symbol == symbol, Asset.currency == currency)
        asset = (await session.execute(stmt)).scalar_one_or_none()

        if asset is None:
            asset = Asset(
                symbol=symbol,
                name=name,
                currency=currency,
                asset_type=asset_type,
                asset_class=asset_class,
                isin=isin,
                exchange=exchange,
            )
            session.add(asset)
            await session.flush()
        return asset

    async def ingest_cams_statement(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
        records: list[CamsTransactionDTO],
    ) -> IngestionResultResponse:
        """Ingests and normalizes domestic mutual fund records from CAMS/KFintech CAS."""
        await self._verify_account_exists(session, account_id)

        inserted = 0
        duplicates = 0
        errors: list[str] = []

        # Batch load existing hashes to minimize round-trip database queries
        hashes = [
            generate_transaction_hash(
                account_id=account_id,
                broker_reference_id=rec.folio_number,
                trade_date=rec.trade_date,
                symbol=rec.isin,
                transaction_type=self._map_cams_tx_type(rec.transaction_type).value,
                quantity=rec.units,
                amount=rec.amount,
            )
            for rec in records
        ]

        existing_hashes_stmt = select(Transaction.deduplication_hash).where(
            Transaction.deduplication_hash.in_(hashes)
        )
        existing_hashes = set((await session.execute(existing_hashes_stmt)).scalars().all())

        for rec, tx_hash in zip(records, hashes):
            try:
                if tx_hash in existing_hashes:
                    duplicates += 1
                    continue

                tx_type = self._map_cams_tx_type(rec.transaction_type)
                asset_class = (
                    AssetClass.DOMESTIC_DEBT
                    if any(w in rec.scheme_name.upper() for w in ["LIQUID", "DEBT", "OVERNIGHT", "BOND"])
                    else AssetClass.DOMESTIC_EQUITY
                )

                asset = await self._get_or_create_asset(
                    session=session,
                    symbol=rec.isin,
                    name=rec.scheme_name,
                    currency=CurrencyCode.INR,
                    asset_type=AssetType.MUTUAL_FUND_IN,
                    asset_class=asset_class,
                    isin=rec.isin,
                    exchange="AMFI",
                )

                fees = rec.stt_tax + rec.stamp_duty
                transaction = Transaction(
                    account_id=account_id,
                    asset_id=asset.id,
                    transaction_type=tx_type,
                    quantity=rec.units,
                    price_per_unit=rec.nav,
                    gross_amount=rec.amount,
                    net_amount=rec.amount + fees if tx_type == TransactionType.BUY else rec.amount - fees,
                    fees=fees,
                    currency=CurrencyCode.INR,
                    trade_date=rec.trade_date,
                    broker_reference_id=rec.folio_number,
                    deduplication_hash=tx_hash,
                    notes=f"CAMS Folio: {rec.folio_number}",
                )
                session.add(transaction)
                existing_hashes.add(tx_hash)
                inserted += 1
            except Exception as exc:
                logger.error("Error processing CAMS record %s: %s", rec, exc)
                errors.append(f"ISIN {rec.isin} ({rec.trade_date}): {str(exc)}")

        await session.flush()
        return IngestionResultResponse(
            account_id=account_id,
            provider="CAMS",
            total_records=len(records),
            inserted_records=inserted,
            duplicate_records_skipped=duplicates,
            errors=errors,
        )

    async def ingest_zerodha_trades(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
        records: list[ZerodhaTradeDTO],
    ) -> IngestionResultResponse:
        """Ingests execution records from Zerodha Tradebook."""
        await self._verify_account_exists(session, account_id)

        inserted = 0
        duplicates = 0
        errors: list[str] = []

        hashes = [
            generate_transaction_hash(
                account_id=account_id,
                broker_reference_id=rec.trade_id,
                trade_date=rec.trade_date,
                symbol=rec.symbol,
                transaction_type=TransactionType.BUY.value if rec.trade_type.lower() == "buy" else TransactionType.SELL.value,
                quantity=rec.quantity,
                amount=rec.quantity * rec.price,
            )
            for rec in records
        ]

        existing_hashes_stmt = select(Transaction.deduplication_hash).where(
            Transaction.deduplication_hash.in_(hashes)
        )
        existing_hashes = set((await session.execute(existing_hashes_stmt)).scalars().all())

        for rec, tx_hash in zip(records, hashes):
            try:
                if tx_hash in existing_hashes:
                    duplicates += 1
                    continue

                tx_type = TransactionType.BUY if rec.trade_type.lower() == "buy" else TransactionType.SELL
                asset = await self._get_or_create_asset(
                    session=session,
                    symbol=rec.symbol.upper(),
                    name=f"{rec.symbol.upper()} Equity",
                    currency=CurrencyCode.INR,
                    asset_type=AssetType.EQUITY_IN,
                    asset_class=AssetClass.DOMESTIC_EQUITY,
                    isin=rec.isin,
                    exchange=rec.exchange,
                )

                gross_amount = rec.quantity * rec.price
                transaction = Transaction(
                    account_id=account_id,
                    asset_id=asset.id,
                    transaction_type=tx_type,
                    quantity=rec.quantity,
                    price_per_unit=rec.price,
                    gross_amount=gross_amount,
                    net_amount=gross_amount,
                    fees=Decimal("0.0"),
                    currency=CurrencyCode.INR,
                    trade_date=rec.trade_date,
                    broker_reference_id=rec.trade_id,
                    deduplication_hash=tx_hash,
                    notes=f"Order ID: {rec.order_id}",
                )
                session.add(transaction)
                existing_hashes.add(tx_hash)
                inserted += 1
            except Exception as exc:
                logger.error("Error processing Zerodha record %s: %s", rec, exc)
                errors.append(f"Trade {rec.trade_id}: {str(exc)}")

        await session.flush()
        return IngestionResultResponse(
            account_id=account_id,
            provider="ZERODHA",
            total_records=len(records),
            inserted_records=inserted,
            duplicate_records_skipped=duplicates,
            errors=errors,
        )

    async def ingest_drivewealth_trades(
        self,
        session: AsyncSession,
        account_id: uuid.UUID,
        records: list[DriveWealthTradeDTO],
    ) -> IngestionResultResponse:
        """Ingests US equities and fractional lots from DriveWealth / INDmoney."""
        await self._verify_account_exists(session, account_id)

        inserted = 0
        duplicates = 0
        errors: list[str] = []

        hashes = [
            generate_transaction_hash(
                account_id=account_id,
                broker_reference_id=rec.order_id,
                trade_date=rec.trade_date,
                symbol=rec.symbol,
                transaction_type=TransactionType.BUY.value if rec.side.upper() == "BUY" else TransactionType.SELL.value,
                quantity=rec.shares,
                amount=rec.gross_amount,
            )
            for rec in records
        ]

        existing_hashes_stmt = select(Transaction.deduplication_hash).where(
            Transaction.deduplication_hash.in_(hashes)
        )
        existing_hashes = set((await session.execute(existing_hashes_stmt)).scalars().all())

        for rec, tx_hash in zip(records, hashes):
            try:
                if tx_hash in existing_hashes:
                    duplicates += 1
                    continue

                tx_type = TransactionType.BUY if rec.side.upper() == "BUY" else TransactionType.SELL
                is_etf = rec.symbol.upper() in ["VOO", "QQQ", "SPY", "VTI", "IVV", "IWM", "VEA", "VWO"]

                asset = await self._get_or_create_asset(
                    session=session,
                    symbol=rec.symbol.upper(),
                    name=f"{rec.symbol.upper()} {'ETF' if is_etf else 'US Equity'}",
                    currency=CurrencyCode.USD,
                    asset_type=AssetType.ETF_US if is_etf else AssetType.EQUITY_US,
                    asset_class=AssetClass.INTERNATIONAL_EQUITY,
                    exchange="NASDAQ",
                )

                transaction = Transaction(
                    account_id=account_id,
                    asset_id=asset.id,
                    transaction_type=tx_type,
                    quantity=rec.shares,
                    price_per_unit=rec.price,
                    gross_amount=rec.gross_amount,
                    net_amount=rec.net_amount,
                    fees=rec.fees,
                    currency=CurrencyCode.USD,
                    trade_date=rec.trade_date,
                    settlement_date=rec.settlement_date,
                    broker_reference_id=rec.order_id,
                    deduplication_hash=tx_hash,
                    notes=f"DriveWealth Order: {rec.order_id}",
                )
                session.add(transaction)
                existing_hashes.add(tx_hash)
                inserted += 1
            except Exception as exc:
                logger.error("Error processing DriveWealth record %s: %s", rec, exc)
                errors.append(f"Order {rec.order_id}: {str(exc)}")

        await session.flush()
        return IngestionResultResponse(
            account_id=account_id,
            provider="DRIVEWEALTH",
            total_records=len(records),
            inserted_records=inserted,
            duplicate_records_skipped=duplicates,
            errors=errors,
        )

    def _map_cams_tx_type(self, raw_type: str) -> TransactionType:
        normalized = raw_type.upper()
        if any(term in normalized for term in ["PURCHASE", "SIP", "REINVESTMENT", "SWITCH IN"]):
            return TransactionType.BUY
        if any(term in normalized for term in ["REDEMPTION", "SWITCH OUT", "WITHDRAWAL"]):
            return TransactionType.SELL
        if "DIVIDEND" in normalized:
            return TransactionType.DIVIDEND
        return TransactionType.BUY


ingestion_service = IngestionService()
