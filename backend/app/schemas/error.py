from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel


class FieldError(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
    timestamp: datetime | None = None
    path: str | None = None
    fields: list[FieldError] | None = None
