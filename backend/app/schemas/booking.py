from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus
from app.models.payment import PaymentStatus


class BookingCreate(BaseModel):
    slot_id: int
    version: int
    participants_count: int = Field(default=1, ge=1)
    with_ball: bool = False


class BookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: BookingStatus
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


class BookingDetailResponse(BookingResponse):
    vendor_name: str = ""
    vendor_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    payment: PaymentResponse | None = None


class AdminBookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: str
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
