from collections.abc import AsyncGenerator
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger("syncfolio.database")

# Initialize the central asynchronous database engine with connection pooling
engine: AsyncEngine = create_async_engine(
    url=settings.ASYNC_DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
)

# Async session factory configured for non-blocking transaction boundaries
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a managed transactional AsyncSession.
    Guarantees rollback on unhandled exceptions and deterministic resource cleanup.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception as exc:
            logger.error("Database transaction rolled back due to error: %s", exc)
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> dict[str, str]:
    """
    Executes a low-overhead liveness probe to verify database connectivity.
    Used by health check routers and container probes.
    """
    async with async_session_factory() as session:
        result = await session.execute(text("SELECT 1"))
        scalar_val = result.scalar()
        if scalar_val == 1:
            return {"status": "connected", "dialect": "postgresql+asyncpg"}
        raise RuntimeError("Database probe returned unexpected response")
