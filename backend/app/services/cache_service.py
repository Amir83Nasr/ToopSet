"""Lightweight Redis cache helpers for frequently-read data.

All cache operations gracefully degrade on ``RedisError`` — callers should
**not** add their own try/except.  A miss under Redis failure behaves the
same as a regular cache miss: fall through to the database.
"""

from __future__ import annotations

import hashlib
import json
import random
from typing import Any

from redis.exceptions import RedisError

from app.core.metrics import toopset_cache_hits_total, toopset_cache_misses_total
from app.core.redis_client import get_redis

_JITTER_RNG = random.Random()

# ── TTLs (seconds) ───────────────────────────────────────────────────────────

TIME_SLOTS_TTL = 30  # short TTL — slots change when someone books
ADMIN_LIST_TTL = 60  # admin list views — fresh enough, reduces DB load
RESPONSE_CACHE_TTL = 60  # default TTL for cached dashboard responses

# ── Helpers ──────────────────────────────────────────────────────────────────


def _ttl_jitter(base_ttl: int) -> int:
    """Add ±20 % jitter to *base_ttl* to prevent cache stampede.

    Using a process-local ``Random`` instance (not the module-level
    ``random``) avoids affecting other callers' entropy.  The jitter is
    non-deterministic across restarts, which is *desired* — it spreads
    expiry times randomly so old-and-new-worker deployments don't align
    their cache-expiry waves.
    """
    delta = max(1, int(base_ttl * 0.2))
    return base_ttl + _JITTER_RNG.randint(-delta, delta)


async def _scan_delete(r: Any, pattern: str) -> None:
    """Delete all keys matching *pattern* using **SCAN** (not KEYS).

    ``KEYS`` blocks Redis for the duration of the scan and is unsafe for
    production.  ``SCAN`` iterates incrementally and returns control to
    the event loop between cursor steps via ``async for``.
    """
    keys = [key async for key in r.scan_iter(match=pattern)]  # type: ignore[attr-defined]
    if keys:
        await r.delete(*keys)


# ── Key helpers ──────────────────────────────────────────────────────────────


def _slot_list_key(vendor_id: int, date: str | None) -> str:
    parts = [f"slots:{vendor_id}"]
    if date:
        parts.append(date)
    return ":".join(parts)


def _admin_list_key(prefix: str, params: dict[str, Any]) -> str:
    """Deterministic Redis key for an admin list query.

    Sorts params by key so the same logical query always maps to the same key.
    """
    sorted_items = sorted((k, str(v)) for k, v in params.items() if v is not None)
    param_str = "&".join(f"{k}={v}" for k, v in sorted_items)
    digest = hashlib.md5(param_str.encode(), usedforsecurity=False).hexdigest()
    return f"admin_list:{prefix}:{digest}"


def _response_cache_key(prefix: str, params: dict[str, Any]) -> str:
    """Deterministic Redis key for a generic cached response.

    Sorts params by key so the same logical query always maps to the same key.
    The prefix distinguishes different endpoint groups.
    """
    sorted_items = sorted((k, str(v)) for k, v in params.items() if v is not None)
    param_str = "&".join(f"{k}={v}" for k, v in sorted_items)
    digest = hashlib.md5(param_str.encode(), usedforsecurity=False).hexdigest()
    return f"resp:{prefix}:{digest}"


# ── Time-slot cache ──────────────────────────────────────────────────────────


async def cache_slot_list(
    vendor_id: int,
    data: list[dict[str, Any]],
    date: str | None = None,
) -> None:
    """Store a serialised slot list in Redis with ``TIME_SLOTS_TTL``."""
    try:
        r = await get_redis()
        key = _slot_list_key(vendor_id, date)
        await r.set(key, json.dumps(data, default=str), ex=_ttl_jitter(TIME_SLOTS_TTL))
    except RedisError:
        pass  # cache miss degrades gracefully — fall through to DB


async def get_cached_slot_list(
    vendor_id: int,
    date: str | None = None,
) -> list[dict[str, Any]] | None:
    """Return cached slot list, or ``None`` on miss / Redis-down."""
    try:
        r = await get_redis()
        key = _slot_list_key(vendor_id, date)
        raw = await r.get(key)
        if raw is not None:
            toopset_cache_hits_total.inc()
            return json.loads(raw)

        toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return None


async def invalidate_slot_list(vendor_id: int) -> None:
    """Drop all slot-list cache keys for a vendor (called after writes)."""
    try:
        r = await get_redis()
        await r.delete(_slot_list_key(vendor_id, None))
        pattern = f"slots:{vendor_id}:*"
        await _scan_delete(r, pattern)
    except RedisError:
        pass


# ── Admin list cache ─────────────────────────────────────────────────────────


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
        await r.set(key, json.dumps(data, default=str), ex=_ttl_jitter(ttl))
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
        await _scan_delete(r, f"admin_list:{prefix}:*")
    except RedisError:
        pass


# ── Generic response cache ─────────────────────────────────────────────


async def cache_response(
    prefix: str,
    params: dict[str, Any],
    data: Any,
    ttl: int = RESPONSE_CACHE_TTL,
) -> None:
    """Cache a serialised response in Redis with the given TTL."""
    try:
        r = await get_redis()
        key = _response_cache_key(prefix, params)
        await r.set(key, json.dumps(data, default=str), ex=_ttl_jitter(ttl))
    except RedisError:
        pass


async def get_cached_response(
    prefix: str,
    params: dict[str, Any],
) -> Any | None:
    """Return cached response, or ``None`` on miss / Redis-down."""
    try:
        r = await get_redis()
        key = _response_cache_key(prefix, params)
        raw = await r.get(key)
        if raw is not None:
            toopset_cache_hits_total.inc()
            return json.loads(raw)

        toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return None


async def invalidate_response_cache(prefix: str) -> None:
    """Drop all response cache keys with the given prefix."""
    try:
        r = await get_redis()
        await _scan_delete(r, f"resp:{prefix}:*")
    except RedisError:
        pass
