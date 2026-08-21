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


# ── Vendor weekly min-price cache ────────────────────────────────────────────

VENDOR_MIN_PRICE_TTL = 86400 * 2  # 48 hours (refreshed daily at midnight)
VENDOR_MIN_PRICES_HASH_KEY = "vendor:min_prices"


async def cache_all_vendor_min_prices(prices: dict[int, float | None]) -> None:
    """Store weekly min prices for all vendors in Redis hash and individual keys."""
    if not prices:
        return
    try:
        r = await get_redis()
        pipe = r.pipeline()
        mapping = {str(vid): json.dumps(price) for vid, price in prices.items()}
        pipe.hset(VENDOR_MIN_PRICES_HASH_KEY, mapping=mapping)
        pipe.expire(VENDOR_MIN_PRICES_HASH_KEY, VENDOR_MIN_PRICE_TTL)
        for vid, price in prices.items():
            key = f"vendor:min_price:{vid}"
            pipe.set(key, json.dumps(price), ex=_ttl_jitter(VENDOR_MIN_PRICE_TTL))
        await pipe.execute()
    except RedisError:
        pass


async def cache_vendor_min_price(vendor_id: int, min_price: float | None) -> None:
    """Store weekly min price for a single vendor in Redis."""
    try:
        r = await get_redis()
        pipe = r.pipeline()
        pipe.hset(VENDOR_MIN_PRICES_HASH_KEY, str(vendor_id), json.dumps(min_price))
        pipe.set(
            f"vendor:min_price:{vendor_id}",
            json.dumps(min_price),
            ex=_ttl_jitter(VENDOR_MIN_PRICE_TTL),
        )
        await pipe.execute()
    except RedisError:
        pass


async def get_cached_vendor_min_price(vendor_id: int) -> tuple[bool, float | None]:
    """Return (found, min_price) from Redis. found=False on cache miss / Redis down."""
    try:
        r = await get_redis()
        val = await r.hget(VENDOR_MIN_PRICES_HASH_KEY, str(vendor_id))
        if val is not None:
            toopset_cache_hits_total.inc()
            return True, json.loads(val)
        # Fallback to individual key
        raw = await r.get(f"vendor:min_price:{vendor_id}")
        if raw is not None:
            toopset_cache_hits_total.inc()
            return True, json.loads(raw)
        toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return False, None


async def get_cached_vendor_min_prices(vendor_ids: list[int]) -> dict[int, float | None]:
    """Batch retrieve cached min prices for a list of vendor IDs."""
    if not vendor_ids:
        return {}
    results: dict[int, float | None] = {}
    try:
        r = await get_redis()
        str_keys = [str(vid) for vid in vendor_ids]
        cached_vals = await r.hmget(VENDOR_MIN_PRICES_HASH_KEY, str_keys)
        missing_ids = []
        for vid, val in zip(vendor_ids, cached_vals):
            if val is not None:
                toopset_cache_hits_total.inc()
                results[vid] = json.loads(val)
            else:
                missing_ids.append(vid)

        if missing_ids:
            # Try individual keys for missing
            keys = [f"vendor:min_price:{vid}" for vid in missing_ids]
            mget_vals = await r.mget(*keys)
            for vid, raw in zip(missing_ids, mget_vals):
                if raw is not None:
                    toopset_cache_hits_total.inc()
                    results[vid] = json.loads(raw)
                else:
                    toopset_cache_misses_total.inc()
    except RedisError:
        pass
    return results


async def compute_and_cache_weekly_min_prices(db: Any) -> dict[int, float | None]:
    """Query PostgreSQL for minimum open slot price in the upcoming 7 days for each vendor and cache it."""
    from datetime import timedelta

    from sqlalchemy import func, select

    from app.core.timezone import now_utc
    from app.models.time_slot import SlotStatus, TimeSlot
    from app.models.vendor import Vendor

    now = now_utc()
    one_week_later = now + timedelta(days=7)

    # Subquery/aggregation: minimum price for open, unreserved slots in the next 7 days
    stmt = (
        select(
            TimeSlot.vendor_id,
            func.min(TimeSlot.base_price).label("min_price"),
        )
        .where(
            TimeSlot.start_time >= now,
            TimeSlot.start_time <= one_week_later,
            TimeSlot.is_reserved == False,
            TimeSlot.status == SlotStatus.OPEN,
        )
        .group_by(TimeSlot.vendor_id)
    )
    result = await db.execute(stmt)
    prices: dict[int, float | None] = {}
    for row in result.all():
        prices[row.vendor_id] = float(row.min_price) if row.min_price is not None else None

    # For active vendors with no slots in next 7 days, ensure key exists with None/0
    all_vendors_stmt = select(Vendor.id).where(Vendor.is_active == True)
    all_vids_res = await db.execute(all_vendors_stmt)
    for row in all_vids_res.all():
        if row.id not in prices:
            prices[row.id] = None

    if prices:
        await cache_all_vendor_min_prices(prices)

    return prices
