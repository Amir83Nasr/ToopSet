from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_serializer

from app.core.card_security import mask_card_number
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
        """Expose only the first and last four digits."""
        return mask_card_number(v) if v else None


class PaymentListResponse(BaseModel):
    payments: list[PaymentDetailResponse]
    total: int
    next_cursor: str | None = None


class PaymentStartResponse(BaseModel):
    checkout_type: Literal["booking", "replacement_hold"] = "booking"
    payment_gateway: Literal["zibal"] = "zibal"
    booking_id: int
    payment_id: int
    amount: float
    track_id: str
    start_url: str
    callback_url: str
    expires_at: datetime | None = None


class PaymentVerificationRequest(BaseModel):
    track_id: str
    order_id: str | None = None


PaymentResolutionOutcome = Literal["paid", "failed", "pending", "reconciliation_required"]


class PaymentResolutionResponse(BaseModel):
    outcome: PaymentResolutionOutcome
    track_id: str
    payment_id: int | None = None
    booking_id: int | None = None
    message: str
    ref_id: str | None = None


class PaymentVerificationStatusResponse(BaseModel):
    track_id: str
    result: int
    verified: bool
    payment_id: int | None = None
    booking_id: int | None = None
    message: str | None = None
    payment_status: str | None = None
    booking_status: str | None = None
    ref_id: str | None = None
