"""Lightweight Redis cache helpers for frequently-read data."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from redis.exceptions import RedisError

from app.core.metrics import toopset_cache_hits_total, toopset_cache_misses_total
from app.core.redis_client import get_redis

# ── TTLs (seconds) ───────────────────────────────────────────────────────────

TIME_SLOTS_TTL = 30  # short TTL — slots change when someone books
ADMIN_LIST_TTL = 60  # admin list views — fresh enough, reduces DB load

# ── Key helpers ──────────────────────────────────────────────────────────────


def _slot_list_key(court_id: int, date: str | None) -> str:
    parts = [f"slots:{court_id}"]
    if date:
        parts.append(date)
    return ":".join(parts)


# ── Time-slot cache ──────────────────────────────────────────────────────────


async def cache_slot_list(
    court_id: int,
    data: list[dict[str, Any]],
    date: str | None = None,
) -> None:
    """Store a serialised slot list in Redis with ``TIME_SLOTS_TTL``."""
    try:
        r = await get_redis()
        key = _slot_list_key(court_id, date)
        await r.setex(key, TIME_SLOTS_TTL, json.dumps(data, default=str))
    except RedisError:
        pass  # cache miss degrades gracefully — fall through to DB


async def get_cached_slot_list(
    court_id: int,
    date: str | None = None,
) -> list[dict[str, Any]] | None:
    """Return cached slot list, or ``None`` on miss / Redis-down."""
    try:
        r = await get_redis()
        key = _slot_list_key(court_id, date)
        raw = await r.get(key)
        if raw is not None:
            toopset_cache_hits_total.inc()
            return json.loads(raw)

        toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return None


async def invalidate_slot_list(court_id: int) -> None:
    """Drop all slot-list cache keys for a court (called after writes)."""
    try:
        r = await get_redis()
        pattern = _slot_list_key(court_id, "*")
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except RedisError:
        pass


# ── Admin list cache ─────────────────────────────────────────────────────────


def _admin_list_key(prefix: str, params: dict[str, Any]) -> str:
    """Deterministic Redis key for an admin list query.

    Sorts params by key so the same logical query always maps to the same key.
    """
    sorted_items = sorted((k, str(v)) for k, v in params.items() if v is not None)
    param_str = "&".join(f"{k}={v}" for k, v in sorted_items)
    digest = hashlib.md5(param_str.encode(), usedforsecurity=False).hexdigest()
    return f"admin_list:{prefix}:{digest}"


async def cache_admin_list(
    prefix: str,
    params: dict[str, Any],
    data: Any,
    ttl: int = ADMIN_LIST_TTL,
) -> None:
    """Cache a serialised admin list response in Redis."""
    try:
        r = await get_redis()
        key = _admin_list_key(prefix, params)
        await r.setex(key, ttl, json.dumps(data, default=str))
    except RedisError:
        pass  # cache miss degrades gracefully


async def get_cached_admin_list(
    prefix: str,
    params: dict[str, Any],
) -> Any | None:
    """Return cached admin list, or ``None`` on miss / Redis-down."""
    try:
        r = await get_redis()
        key = _admin_list_key(prefix, params)
        raw = await r.get(key)
        if raw is not None:
            toopset_cache_hits_total.inc()
            return json.loads(raw)

        toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return None


async def invalidate_admin_list_cache(prefix: str) -> None:
    """Drop all admin-list cache keys with the given prefix."""
    try:
        r = await get_redis()
        keys = await r.keys(f"admin_list:{prefix}:*")
        if keys:
            await r.delete(*keys)
    except RedisError:
        pass
