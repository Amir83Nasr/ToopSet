from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class TimeSlotCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime
    base_price: Decimal = Field(..., gt=0, decimal_places=2)


class TimeSlotUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    base_price: Decimal | None = Field(None, gt=0, decimal_places=2)


class TimeSlotResponse(BaseModel):
    id: int
    court_id: int
    start_time: datetime
    end_time: datetime
    base_price: float
    is_reserved: bool
    version: int

    model_config = {"from_attributes": True}


class TimeSlotDetailResponse(TimeSlotResponse):
    court_name: str = ""
    court_address: str = ""
    court_sport_type: str = ""

    model_config = {"from_attributes": True}


class TimeSlotListResponse(BaseModel):
    slots: list[TimeSlotResponse]
    total: int
