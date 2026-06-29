from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.court import SportType


class CourtImageResponse(BaseModel):
    id: int
    url: str
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


_SPORT_MAP: dict[str, str] = {
    "والیبال": "volleyball",
    "بسکتبال": "basketball",
    "فوتسال": "futsal",
    "هندبال": "handball",
    "فوتبال": "football",
}


class CourtBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    sport_types: list[SportType] = Field(..., min_length=1)
    address: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    capacity: int = Field(..., gt=0)
    amenities: dict | None = None

    @field_validator("sport_types", mode="before")
    @classmethod
    def _normalize_sport_types(cls, v: object) -> object:
        if isinstance(v, list):
            return [_SPORT_MAP.get(item, item) for item in v]
        return v


class CourtCreate(CourtBase):
    images: list[str] | None = None
    temp_ids: list[str] | None = None


class CourtUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=256)
    sport_types: list[SportType] | None = Field(None, min_length=1)
    address: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    capacity: int | None = Field(None, gt=0)
    is_active: bool | None = None
    amenities: dict | None = None
    images: list[str] | None = None
    image_ids_to_remove: list[int] | None = None


class CourtResponse(CourtBase):
    id: int
    manager_id: int
    manager_name: str | None = None
    manager_phone: str | None = None
    images: list[str] | None = None
    court_images: list[CourtImageResponse] | None = None
    is_active: bool
    average_rating: float
    base_price: Decimal | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CourtListResponse(BaseModel):
    courts: list[CourtResponse]
    total: int
    next_cursor: str | None = None
