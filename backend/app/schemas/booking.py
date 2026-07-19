from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_serializer

from app.core.card_security import mask_card_number
from app.models.booking import BookingStatus
from app.models.payment import PaymentStatus
from app.models.replacement import BookingHoldStatus


class BookingCreate(BaseModel):
    slot_id: int
    version: int
    participants_count: int = Field(default=1, ge=1)
    with_ball: bool = False


class BookingCancelRequest(BaseModel):
    accepted_terms: bool = False
    card_number: str | None = Field(None, min_length=16, max_length=24)


class BookingCancellationTermsResponse(BaseModel):
    booking_id: int
    can_cancel: bool
    requires_bank_card: bool
    has_verified_bank_card: bool
    mode: str
    refund_amount: float
    penalty_amount: float
    rules: list[str]
    blocking_reason: str | None = None


class BookingResponse(BaseModel):
    checkout_type: Literal["booking"] = "booking"
    id: int
    user_id: int
    slot_id: int
    status: BookingStatus
    source: str = "online"
    settlement_status: str = "not_settled"
    customer_full_name: str | None = None
    customer_phone: str | None = None
    price_paid: float
    slot_price: float | None = None
    ball_price: float = 0
    with_ball: bool = False
    penalty_amount: float | None = None
    participants_count: int = 1
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingDetailResponse]
    total: int
    next_cursor: str | None = None
    category_counts: dict[str, int] | None = None


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    gateway_transaction_id: str | None = None
    gateway_name: str | None = None
    card_number: str | None = None
    ref_id: str | None = None
    gateway_fee: float | None = None
    paid_at: datetime | None = None
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("card_number")
    @classmethod
    def mask_payment_card(cls, value: str | None) -> str | None:
        return mask_card_number(value) if value else None


class BookingDetailResponse(BookingResponse):
    vendor_name: str = ""
    vendor_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    payment: PaymentResponse | None = None
    refund_status: str | None = None
    refund_amount: float | None = None
    refund_penalty_amount: float | None = None
    refund_requested_at: datetime | None = None
    refund_approved_at: datetime | None = None
    refund_paid_at: datetime | None = None
    refund_payment_tracking_code: str | None = None
    refund_destination_card_masked: str | None = None


class ReplacementHoldResponse(BaseModel):
    checkout_type: Literal["replacement_hold"] = "replacement_hold"
    id: int
    replacement_request_id: int
    original_booking_id: int
    replacement_booking_id: int | None = None
    user_id: int
    slot_id: int
    status: BookingHoldStatus
    price_paid: float
    slot_price: float
    ball_price: float = 0
    with_ball: bool = False
    participants_count: int = 1
    expires_at: datetime
    failure_code: str | None = None
    vendor_name: str = ""
    vendor_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None

    model_config = {"from_attributes": True}


BookingCreateResponse = BookingDetailResponse | ReplacementHoldResponse


class AdminBookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: str
    source: str = "online"
    settlement_status: str = "not_settled"
    customer_full_name: str | None = None
    customer_phone: str | None = None
    price_paid: float
    slot_price: float | None = None
    ball_price: float = 0
    with_ball: bool = False
    penalty_amount: float | None = None
    participants_count: int = 1
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None
    vendor_name: str = ""
    vendor_address: str = ""
    user_name: str = ""
    user_phone: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    model_config = {"from_attributes": True}


class AdminBookingListResponse(BaseModel):
    bookings: list[AdminBookingResponse]
    total: int
    next_cursor: str | None = None
