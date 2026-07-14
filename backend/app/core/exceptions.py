from __future__ import annotations

import logging
from collections.abc import Mapping
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy.exc import IntegrityError, StatementError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.correlation_id import get_request_id
from app.schemas.error import ErrorResponse, FieldError

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Hardens HTTP responses with security-related headers.

    Following OWASP Secure Headers recommendations for a JSON API:
      - ``X-Content-Type-Options: nosniff`` — prevents MIME-type sniffing
      - ``X-Frame-Options: DENY`` — prevents clickjacking
      - ``X-XSS-Protection: 0`` — disables legacy XSS auditor (modern browsers
        have removed it; setting 0 avoids unwanted behaviour in older ones)
      - ``Strict-Transport-Security`` — enforces HTTPS (31536000s = 1 year incl. subdomains)
      - ``Content-Security-Policy`` — restricts resource sources to prevent XSS
      - ``Referrer-Policy`` — controls referrer header leakage
      - ``Permissions-Policy`` — disables sensitive browser features
      - ``Cache-Control`` — prevents caching of sensitive responses
    """

    # Paths whose responses should NOT be cached (auth tokens, personal data)
    _SENSITIVE_PATHS = (
        "/api/v1/auth/",
        "/api/v1/users/me",
        "/api/v1/admin/",
    )
    _DOCS_PATHS = (
        "/docs",
        "/redoc",
        "/openapi.json",
        "/docs/oauth2-redirect",
    )

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if request.url.path in self._DOCS_PATHS:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "font-src 'self' https://cdn.jsdelivr.net; "
                "connect-src 'self'; form-action 'none'; frame-ancestors 'none'"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; img-src 'self' data:; "
                "style-src 'self' 'unsafe-inline'; font-src 'self'; "
                "connect-src 'self'; form-action 'none'; frame-ancestors 'none'"
            )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        # Prevent caching of sensitive endpoints
        if request.url.path.startswith(self._SENSITIVE_PATHS):
            response.headers["Cache-Control"] = "no-store, max-age=0"
        return response


def _make_response(
    status_code: int,
    detail: str,
    request: Request | None = None,
    error_code: str | None = None,
    fields: list[FieldError] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        detail=detail,
        error_code=error_code,
        timestamp=datetime.now(timezone.utc),
        path=str(request.url.path) if request is not None else None,
        request_id=get_request_id() or None,
        fields=fields,
    ).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=body, headers=headers)


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, HTTPException):
        raise exc
    return _make_response(
        status_code=exc.status_code,
        detail=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
        request=request,
        error_code=_status_to_code(exc.status_code),
        headers=exc.headers,
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    fields: list[FieldError] = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field_name = ".".join(str(x) for x in loc[1:] if x != "body")
        msg = err.get("msg", "")
        fields.append(
            FieldError(
                field=field_name or "unknown",
                message=_translate_validation_message(msg, field_name),
            )
        )
    return _make_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="اطلاعات وارد شده معتبر نیست",
        request=request,
        error_code="validation_error",
        fields=fields,
    )


async def integrity_error_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, IntegrityError):
        raise exc
    detail = "این اطلاعات قبلاً ثبت شده است"
    orig_msg = str(exc.orig or "").lower()
    if "unique constraint" in orig_msg or "duplicate key" in orig_msg:
        if "phone" in orig_msg:
            detail = "این شماره تلفن قبلاً ثبت‌نام کرده است"
        elif "email" in orig_msg:
            detail = "این ایمیل قبلاً ثبت شده است"
        elif "slug" in orig_msg:
            detail = "این شناسه قبلاً استفاده شده است"

    logger.warning("IntegrityError: %s", exc)
    return _make_response(
        status_code=status.HTTP_409_CONFLICT,
        detail=detail,
        request=request,
        error_code="duplicate",
    )


async def statement_error_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StatementError):
        raise exc
    logger.exception("Database statement error on %s", request.url.path)
    return _make_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="خطای پایگاه داده. لطفاً بعداً تلاش کنید.",
        request=request,
        error_code="database_error",
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s", request.url.path)
    return _make_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="خطای داخلی سرور. لطفاً بعداً تلاش کنید.",
        request=request,
        error_code="internal_error",
    )


def _status_to_code(status_code: int) -> str:
    mapping = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
        500: "internal_error",
    }
    return mapping.get(status_code, f"http_{status_code}")


_VALIDATION_TRANSLATIONS: dict[str, str] = {
    "field required": "این فیلد اجباری است",
    "extra fields not permitted": "فیلد اضافی مجاز نیست",
    "value error": "مقدار نامعتبر",
    "missing": "این فیلد اجباری است",
    "type_error": "نوع داده نامعتبر",
    "value_error": "مقدار نامعتبر",
}

_FIELD_TRANSLATIONS: dict[str, str] = {
    "phone": "شماره تلفن",
    "password": "رمز عبور",
    "full_name": "نام و نام خانوادگی",
    "email": "ایمیل",
    "name": "نام",
    "address": "آدرس",
    "capacity": "ظرفیت",
    "price": "قیمت",
    "description": "توضیحات",
    "role": "نقش",
    "sport_types": "نوع ورزش",
    "latitude": "عرض جغرافیایی",
    "longitude": "طول جغرافیایی",
    "start_time": "زمان شروع",
    "end_time": "زمان پایان",
    "date": "تاریخ",
    "message": "پیام",
    "title": "عنوان",
    "booking_id": "شناسه رزرو",
    "vendor_id": "شناسه مجموعه",
    "user_id": "شناسه کاربر",
}


def _translate_validation_message(msg: str, field: str) -> str:
    for eng, fa in _VALIDATION_TRANSLATIONS.items():
        if eng in msg.lower():
            fa_field = _FIELD_TRANSLATIONS.get(field, field)
            return f"{fa_field}: {fa}"
    return msg
