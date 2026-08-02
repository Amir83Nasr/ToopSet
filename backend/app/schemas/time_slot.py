from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.time_slot import SlotGender, SlotStatus


class TimeSlotCreate(BaseModel):
    vendor_id: int
    start_time: datetime
    end_time: datetime
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    gender: SlotGender = SlotGender.MALE


class TimeSlotUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    base_price: Decimal | None = Field(None, gt=0, decimal_places=2)
    gender: SlotGender | None = None
    status: SlotStatus | None = None

    @field_validator("status")
    @classmethod
    def prevent_manual_system_statuses(cls, value: SlotStatus | None) -> SlotStatus | None:
        if value in {
            SlotStatus.RESERVING,
            SlotStatus.RESERVED,
            SlotStatus.PENDING_CANCELLATION,
        }:
            raise ValueError("Reservation-managed slot statuses cannot be set manually")
        return value


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
    gender: SlotGender = SlotGender.MALE

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError("Time must be in HH:MM format")
        return v

    @model_validator(mode="after")
    def validate_time_order(self) -> "TimeSlotTemplate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


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

    @model_validator(mode="after")
    def validate_template_overlap(self) -> "TimeSlotGenerate":
        if self.date_to > self.date_from + timedelta(days=186):
            raise ValueError("Slot generation range cannot exceed 186 days")
        ordered = sorted(self.templates, key=lambda item: item.start_time)
        for previous, current in zip(ordered, ordered[1:], strict=False):
            if current.start_time < previous.end_time:
                raise ValueError("Time slot templates must not overlap")
        return self


class TimeSlotGenerateResponse(BaseModel):
    created: int
    skipped: int
    total: int
    slots: list[TimeSlotResponse]


class WeeklyScheduleItem(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Saturday ... 6=Friday")
    start_time: str
    end_time: str
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    gender: SlotGender = SlotGender.MALE

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_weekly_time(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError as exc:
            raise ValueError("Time must be in HH:MM format") from exc
        return value

    @model_validator(mode="after")
    def validate_order(self) -> "WeeklyScheduleItem":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class WeeklyScheduleApply(BaseModel):
    effective_from: date
    duration_months: Literal[1, 3, 6, 12]
    items: list[WeeklyScheduleItem] = Field(default_factory=list, max_length=70)
    confirm_manager_booking_deletions: bool = False

    @model_validator(mode="after")
    def validate_no_template_overlap(self) -> "WeeklyScheduleApply":
        by_day: dict[int, list[WeeklyScheduleItem]] = {}
        for item in self.items:
            by_day.setdefault(item.day_of_week, []).append(item)
        for day_items in by_day.values():
            ordered = sorted(day_items, key=lambda item: item.start_time)
            for previous, current in zip(ordered, ordered[1:], strict=False):
                if current.start_time < previous.end_time:
                    raise ValueError("Weekly schedule items must not overlap")
        return self


class WeeklyScheduleTemplateResponse(BaseModel):
    source: Literal["saved_version", "upcoming_week"]
    version_id: int | None = None
    effective_from: date | None = None
    effective_until: date | None = None
    minimum_effective_date: date
    last_online_booking_date: date | None = None
    ball_available: bool = False
    ball_price: Decimal = Decimal("0")
    items: list[WeeklyScheduleItem] = Field(default_factory=list)


class WeeklyScheduleConflict(BaseModel):
    slot_id: int
    date: date
    start_time: datetime
    end_time: datetime
    booking_id: int | None = None
    booking_source: str | None = None
    reason: str


class WeeklyScheduleApplyResponse(BaseModel):
    effective_from: date
    effective_until: date
    created: int
    updated: int
    deleted: int
    unchanged: int
    preserved_reserved: int
    deleted_manager_reservations: int = 0
    conflicts: list[WeeklyScheduleConflict] = Field(default_factory=list)
