from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SettingResponse(BaseModel):
    id: int
    key: str
    value: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class SettingUpdateRequest(BaseModel):
    value: str
