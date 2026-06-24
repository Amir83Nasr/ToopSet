from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ManagerBookingResponse(BaseModel):
    id: int
    user_id: int
    slot_id: int
    status: str
    price_paid: float
    penalty_amount: float | None = None
    participants_count: int = 1
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None
    court_name: str = ""
    court_address: str = ""
    user_name: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None

    model_config = {"from_attributes": True}


class ManagerBookingListResponse(BaseModel):
    bookings: list[ManagerBookingResponse]
    total: int


class ManagerSlotResponse(BaseModel):
    id: int
    court_id: int
    start_time: datetime
    end_time: datetime
    base_price: float
    is_reserved: bool = False
    version: int = 1
    court_name: str = ""
    court_address: str = ""
    court_sport_type: str = ""
    booking_id: int | None = None
    booking_user_name: str | None = None
    booking_status: str | None = None

    model_config = {"from_attributes": True}


class ManagerSlotListResponse(BaseModel):
    slots: list[ManagerSlotResponse]
    total: int
