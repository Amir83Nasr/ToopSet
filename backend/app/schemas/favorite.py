from datetime import datetime

from pydantic import BaseModel

from app.schemas.vendor import VendorResponse


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    vendor_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteWithVendorResponse(BaseModel):
    id: int
    vendor: VendorResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteCheckResponse(BaseModel):
    favorited_vendor_ids: list[int]
    favorited_court_ids: list[int] | None = None
