from pydantic import BaseModel

from app.schemas.court import CourtResponse


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    court_id: int
    created_at: str

    model_config = {"from_attributes": True}


class FavoriteWithCourtResponse(BaseModel):
    id: int
    court: CourtResponse
    created_at: str

    model_config = {"from_attributes": True}


class FavoriteCheckResponse(BaseModel):
    favorited_court_ids: list[int]
