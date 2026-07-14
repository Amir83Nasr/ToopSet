"""Async Redis client for ToopSet backend.

Provides a module-level ``redis_client`` singleton and lifecycle helpers.
Import ``get_redis()`` in services to obtain the client on demand.

The singleton re-creates the underlying ``Redis`` connection if the active
event loop changes — necessary because asyncio transports are tied to the
loop they were created on, and test frameworks may run fixtures on different
loops from the test body.
"""

from __future__ import annotations

import asyncio

from redis import asyncio as aioredis
from redis.asyncio.connection import ConnectionPool

from app.core.config import settings

_redis: aioredis.Redis | None = None
_redis_loop_id: int | None = None
_pool: ConnectionPool | None = None

# Maximum connections in pool; per redis-py docs, a value of 2× CPU count
# is the default, but 50-100 is typical for web workloads.
_REDIS_POOL_MAX_CONNECTIONS = 50


async def get_redis() -> aioredis.Redis:
    """Return the shared Redis client.

    Creates a new connection pool on first call, or transparently re-creates
    it when the calling event loop differs from the one the client was created
    on (supports pytest-asyncio's per-test loop isolation).

    Hardens the connection with:
      - Connection pool (``ConnectionPool`` with ``max_connections``)
      - ``socket_keepalive`` (detect half-open TCP connections)
      - ``retry_on_timeout`` (retry on transient network blips)
      - ``health_check_interval`` (periodically verify connection health)
      - ``socket_connect_timeout`` / ``socket_timeout`` (fail fast)
    """
    global _redis, _redis_loop_id, _pool
    current_loop_id = id(asyncio.get_running_loop())
    if _redis is None or _redis_loop_id != current_loop_id:
        await _teardown()

        _pool = ConnectionPool.from_url(
            settings.redis_url,
            max_connections=_REDIS_POOL_MAX_CONNECTIONS,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            socket_keepalive=True,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        _redis = aioredis.Redis.from_pool(_pool)  # type: ignore[attr-defined]
        _redis_loop_id = current_loop_id
    return _redis


async def _teardown() -> None:
    """Safely release the current pool and client."""
    global _redis, _pool, _redis_loop_id
    try:
        if _redis is not None:
            # redis 8.x stubs lag behind
            await _redis.aclose()  # type: ignore[attr-defined]
    except Exception:
        pass
    try:
        if _pool is not None:
            await _pool.disconnect()
    except Exception:
        pass
    _redis = None
    _pool = None
    _redis_loop_id = None


async def close_redis() -> None:
    """Tear down the shared Redis client (call during shutdown)."""
    await _teardown()
