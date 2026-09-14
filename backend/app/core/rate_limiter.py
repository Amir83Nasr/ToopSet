"""Redis-backed rate limiter using slowapi.

Initialises a shared Limiter instance that auth endpoints use via decorators.

Gracefully degrades to in-memory storage when Redis is not reachable, ensuring
the application continues to function under temporary Redis failures.

``pre_auth_limit`` is a FastAPI dependency that enforces the same fixed-window
limits *before* the endpoint's other dependencies (auth, DB sessions) resolve.
The slowapi ``@limiter.limit`` decorator only evaluates when the endpoint
function itself is invoked — i.e. after FastAPI has already run auth
dependencies and checked out DB sessions — so floods of requests that fail
authentication were never counted against any limit. Endpoints that need the
guard up front (login, OTP, booking writes) use the dependency instead of the
decorator.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from fastapi import HTTPException
from limits import parse_many
from limits.storage import MemoryStorage, RedisStorage, Storage
from limits.strategies import FixedWindowRateLimiter
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from app.core.config import settings

logger = logging.getLogger(__name__)


# Redis storage with slowapi's built-in in-memory fallback: no import-time
# socket probe (which blocked startup ~1s when Redis was down and diverged
# limits across workers). Connection failures at request time fall back to
# memory automatically; in production a missing Redis is a deploy error, so
# validate_env still requires REDIS_HOST/REDIS_URL to be set.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    strategy="fixed-window",
    in_memory_fallback_enabled=True,
)


def rate_limit_exceeded_handler(_request: Request, _exc: Exception) -> JSONResponse:
    """Persian 429 response for rate-limited requests."""
    detail = "تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید."
    return JSONResponse(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": detail},
    )


# ── Pre-auth dependency limiter ───────────────────────────────────────

_redis_storage: Storage = RedisStorage(settings.redis_url)
_memory_storage: Storage = MemoryStorage()
_redis_strategy = FixedWindowRateLimiter(_redis_storage)
_memory_strategy = FixedWindowRateLimiter(_memory_storage)


def pre_auth_limit(rate: str, scope: str) -> Callable[[Request], Awaitable[None]]:
    """Build a dependency that enforces ``rate`` (e.g. ``"12/minute"``).

    Declare it BEFORE the endpoint's service/auth dependencies so the limit is
    counted even for requests that would be rejected by authentication.
    Honours ``limiter.enabled`` (tests disable it via conftest).
    """

    items = list(parse_many(rate))

    async def _check(request: Request) -> None:
        if not limiter.enabled:
            return
        remote = get_remote_address(request) or "unknown"
        for item in items:
            try:
                allowed = _redis_strategy.hit(item, f"{scope}:{remote}")
            except Exception:
                logger.warning(
                    "rate-limit Redis storage unavailable for scope %s; using in-memory fallback",
                    scope,
                    exc_info=True,
                )
                allowed = _memory_strategy.hit(item, f"{scope}:{remote}")
            if not allowed:
                # Plain HTTPException (not slowapi's RateLimitExceeded, which
                # requires one of its internal Limit objects): the app's
                # http_exception handler renders the same Persian 429 body.
                raise HTTPException(
                    status_code=HTTP_429_TOO_MANY_REQUESTS,
                    detail="تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید.",
                )

    return _check
