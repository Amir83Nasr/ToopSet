"""Redis-backed rate limiter using slowapi.

Initialises a shared Limiter instance that auth endpoints use via decorators.

Gracefully degrades to in-memory storage when Redis is not reachable, ensuring
the application continues to function under temporary Redis failures.
"""

from __future__ import annotations

import logging
import socket

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from app.core.config import settings

logger = logging.getLogger(__name__)


def _redis_is_reachable(host: str, port: int, timeout: float = 1.0) -> bool:
    """Probe whether the Redis TCP port is reachable.

    Runs synchronously at module load time (single socket connect, no event
    loop required).  Does *not* guarantee that Redis will stay reachable for
    the duration of the request, but covers the common case of a missing or
    restarting Redis at startup.
    """
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.timeout):
        return False


# Initialise rate-limiter storage — try Redis, fall back to in-memory
_storage_uri = settings.redis_url
if not _redis_is_reachable(settings.redis_host, settings.redis_port):
    _storage_uri = "memory://"
    logger.warning(
        "Redis at %s:%d is not reachable — rate limiter falling back to in-memory storage",
        settings.redis_host,
        settings.redis_port,
    )

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    strategy="fixed-window",
)


def rate_limit_exceeded_handler(_request: Request, _exc: Exception) -> JSONResponse:
    """Persian 429 response for rate-limited requests."""
    detail = "تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید."
    return JSONResponse(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": detail},
    )
