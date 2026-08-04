from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ManagerBookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: str
    source: str = "online"
    settlement_status: str = "not_settled"
    settlement_state: (
        Literal[
            "settled",
            "pending_settlement",
            "eligible",
            "not_yet_eligible",
        ]
        | None
    ) = None
    customer_full_name: str | None = None
    customer_phone: str | None = None
    price_paid: float
    penalty_amount: float | None = None
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


class ManagerBookingListResponse(BaseModel):
    bookings: list[ManagerBookingResponse]
    total: int
    next_cursor: str | None = None


class ManagerSlotResponse(BaseModel):
    id: int
    vendor_id: int
    start_time: datetime
    end_time: datetime
    base_price: float
    ball_price: float = 0
    ball_available: bool = False
    gender: str = "male"
    status: str = "open"
    is_reserved: bool = False
    version: int = 1
    vendor_name: str = ""
    vendor_address: str = ""
    vendor_sport_type: str = ""
    booking_id: int | None = None
    booking_user_name: str | None = None
    booking_status: str | None = None

    model_config = {"from_attributes": True}


class ManagerSlotListResponse(BaseModel):
    slots: list[ManagerSlotResponse]
    total: int
    next_cursor: str | None = None
