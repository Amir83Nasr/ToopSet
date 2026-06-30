from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.bank_card import BankCardStatus


class BankCardLookupRequest(BaseModel):
    card_number: str = Field(..., min_length=16, max_length=24)


class BankCardResponse(BaseModel):
    id: int
    masked_card_number: str
    holder_name: str | None = None
    status: BankCardStatus
    verified_at: datetime | None = None

    model_config = {"from_attributes": True}
