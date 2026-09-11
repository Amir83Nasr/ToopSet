"""Redis-backed rate limiter using slowapi.

Initialises a shared Limiter instance that auth endpoints use via decorators.

Gracefully degrades to in-memory storage when Redis is not reachable, ensuring
the application continues to function under temporary Redis failures.
"""

from __future__ import annotations

import logging

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
