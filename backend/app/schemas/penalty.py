from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PenaltyResponse(BaseModel):
    id: int
    user_id: int
    booking_id: int
    amount: float
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PenaltyListResponse(BaseModel):
    penalties: list[PenaltyResponse]
    total: int
