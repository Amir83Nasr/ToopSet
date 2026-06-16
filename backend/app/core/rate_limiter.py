"""Redis-backed rate limiter using slowapi.

Initialises a shared Limiter instance that auth endpoints use via decorators.
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379/0",
    strategy="fixed-window",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Persian 429 response for rate-limited requests."""
    detail = "تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید."
    return JSONResponse(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": detail},
    )
