import logging
import time

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.profiler import record_db_query

logger = logging.getLogger(__name__)

_SLOW_QUERY_THRESHOLD_MS = 200

engine = create_async_engine(
    settings.database_url,
    echo=False,
    # Prevent SQLAlchemy exception/log rendering from exposing passwords,
    # phones, card identifiers, or other bound request values.
    hide_parameters=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,
    pool_timeout=settings.db_pool_timeout,
    connect_args={
        "timeout": 5,
        "statement_cache_size": 0,
    },
)


# ── Query timing instrumentation ─────────────────────────────────────


@event.listens_for(engine.sync_engine, "before_cursor_execute")
def _before_execute(conn, cursor, statement, parameters, context, executemany):
    """Record the start time before each query."""
    conn._query_start_time = time.perf_counter()  # type: ignore[attr-defined]


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def _after_execute(conn, cursor, statement, parameters, context, executemany):
    """Log slow queries and re-export pool stats after each execution."""
    start = getattr(conn, "_query_start_time", None)
    if start is None:
        return
    elapsed_ms = (time.perf_counter() - start) * 1000

    # Record in profiler middleware (no-op if profiling disabled)
    record_db_query(elapsed_ms)

    if elapsed_ms > _SLOW_QUERY_THRESHOLD_MS:
        truncated = statement[:300] if len(statement) > 300 else statement
        logger.warning("Slow query (%.0f ms): %s", elapsed_ms, truncated)


async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
