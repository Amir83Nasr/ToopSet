from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.time_slot import SlotGender, SlotStatus


class TimeSlotCreate(BaseModel):
    vendor_id: int
    start_time: datetime
    end_time: datetime
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    ball_price: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    ball_available: bool = False
    gender: SlotGender = SlotGender.MALE


class TimeSlotUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    base_price: Decimal | None = Field(None, gt=0, decimal_places=2)
    ball_price: Decimal | None = Field(None, ge=0, decimal_places=2)
    ball_available: bool | None = None
    gender: SlotGender | None = None
    status: SlotStatus | None = None


class TimeSlotResponse(BaseModel):
    id: int
    vendor_id: int
    start_time: datetime
    end_time: datetime
    base_price: float
    ball_price: float = 0
    ball_available: bool = False
    gender: SlotGender = SlotGender.MALE
    status: SlotStatus = SlotStatus.OPEN
    is_reserved: bool
    version: int

    model_config = {"from_attributes": True}


class TimeSlotDetailResponse(TimeSlotResponse):
    vendor_name: str = ""
    vendor_address: str = ""
    vendor_sport_type: str = ""

    model_config = {"from_attributes": True}


class TimeSlotListResponse(BaseModel):
    slots: list[TimeSlotResponse]
    total: int
    next_cursor: str | None = None


class TimeSlotTemplate(BaseModel):
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    ball_price: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    ball_available: bool = False
    gender: SlotGender = SlotGender.MALE

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError("Time must be in HH:MM format")
        return v


class TimeSlotGenerate(BaseModel):
    date_from: date
    date_to: date
    days_of_week: list[int] = Field(..., min_length=1, max_length=7)
    templates: list[TimeSlotTemplate] = Field(..., min_length=1, max_length=20)

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: list[int]) -> list[int]:
        for d in v:
            if d < 0 or d > 6:
                raise ValueError("Days must be between 0 (Sat) and 6 (Fri)")
        return sorted(set(v))

    @field_validator("date_to")
    @classmethod
    def validate_date_range(cls, v: date, info) -> date:
        if "date_from" in info.data and v < info.data["date_from"]:
            raise ValueError("date_to must be after date_from")
        return v


class TimeSlotGenerateResponse(BaseModel):
    created: int
    skipped: int
    total: int
    slots: list[TimeSlotResponse]
