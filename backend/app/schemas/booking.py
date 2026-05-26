from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus
from app.models.payment import PaymentStatus


class BookingCreate(BaseModel):
    slot_id: int
    version: int
    participants_count: int = Field(default=1, ge=1)


class BookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: BookingStatus
    price_paid: float
    penalty_amount: float | None = None
    participants_count: int = 1
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    gateway_transaction_id: str | None = None
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingDetailResponse(BookingResponse):
    court_name: str = ""
    court_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    payment: PaymentResponse | None = None
