from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_serializer

from app.models.payment import PaymentStatus


class PaymentDetailResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    status: PaymentStatus
    user_name: str = ""
    gateway_transaction_id: str | None = None
    gateway_name: str | None = None
    card_number: str | None = None
    ref_id: str | None = None
    gateway_fee: float | None = None
    paid_at: datetime | None = None
    created_at: datetime
    vendor_name: str = ""
    vendor_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    model_config = {"from_attributes": True}

    @field_serializer("card_number")
    @classmethod
    def mask_card_number(cls, v: str | None) -> str | None:
        """Only expose the last 4 digits of the card number."""
        if v is None or len(v) < 4:
            return v
        return f"******{v[-4:]}"


class PaymentListResponse(BaseModel):
    payments: list[PaymentDetailResponse]
    total: int
    next_cursor: str | None = None
