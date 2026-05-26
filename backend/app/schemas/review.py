from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)  # 1-5 stars
    comment: str | None = Field(None, max_length=1000)


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    court_id: int
    booking_id: int
    rating: int
    comment: str | None
    response: str | None = None
    is_reported: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    total: int


class ReviewRespondRequest(BaseModel):
    response: str = Field(..., min_length=1, max_length=2000)


class ReviewDetailResponse(ReviewResponse):
    court_name: str = ""
    user_name: str = ""
