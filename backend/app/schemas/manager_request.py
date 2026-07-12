from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ManagerRequestCreate(BaseModel):
    vendor_name: str = Field(..., min_length=1, max_length=256)
    phone: str = Field(..., min_length=10, max_length=16)
    message: str | None = Field(None, max_length=2000)


class ManagerRequestResponse(BaseModel):
    id: int
    user_id: int
    vendor_name: str
    phone: str
    message: str | None
    status: str
    admin_note: str | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ManagerRequestListResponse(BaseModel):
    requests: list[ManagerRequestResponse]


class ManagerRequestStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(approved|rejected)$")
    admin_note: str | None = Field(None, max_length=2000)
