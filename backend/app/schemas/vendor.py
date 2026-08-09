from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.vendor import SportType


class VendorImageResponse(BaseModel):
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


class VendorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    sport_types: list[SportType] = Field(..., min_length=1)
    address: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    capacity: int = Field(..., gt=0)
    amenities: dict | None = None
    ball_available: bool = False
    ball_price: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)

    @model_validator(mode="after")
    def validate_ball_configuration(self) -> "VendorBase":
        if not self.ball_available:
            self.ball_price = Decimal("0")
        elif self.ball_price <= 0:
            raise ValueError("ball_price must be positive when ball rental is available")
        return self

    @field_validator("sport_types", mode="before")
    @classmethod
    def _normalize_sport_types(cls, v: object) -> object:
        if isinstance(v, list):
            return [_SPORT_MAP.get(item, item) for item in v]
        return v


class VendorCreate(VendorBase):
    images: list[str] | None = None
    temp_ids: list[str] | None = None


class VendorUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=256)
    sport_types: list[SportType] | None = Field(None, min_length=1)
    address: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    capacity: int | None = Field(None, gt=0)
    is_active: bool | None = None
    amenities: dict | None = None
    ball_available: bool | None = None
    ball_price: Decimal | None = Field(None, ge=0, decimal_places=2)
    images: list[str] | None = None
    temp_ids: list[str] | None = None
    image_ids_to_remove: list[int] | None = None

    @model_validator(mode="after")
    def validate_ball_configuration(self) -> "VendorUpdate":
        if self.ball_available is False:
            self.ball_price = Decimal("0")
        elif self.ball_available is True and (self.ball_price is None or self.ball_price <= 0):
            raise ValueError("ball_price must be positive when ball rental is available")
        return self


class VendorListItemResponse(BaseModel):
    id: int
    name: str
    sport_types: list[SportType]
    address: str
    latitude: float
    longitude: float
    capacity: int
    manager_name: str | None = None
    main_image: str | None = None
    is_active: bool
    average_rating: float
    base_price: Decimal | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VendorResponse(VendorBase):
    id: int
    manager_id: int
    manager_name: str | None = None
    manager_phone: str | None = None
    images: list[str] | None = None
    main_image: str | None = None
    vendor_images: list[VendorImageResponse] | None = None
    is_active: bool
    average_rating: float
    ball_price: float = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class VendorListResponse(BaseModel):
    vendors: list[VendorListItemResponse]
    total: int
    next_cursor: str | None = None
