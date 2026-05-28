from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.penalty_repo import PenaltyRepo
from app.schemas.penalty import PenaltyListResponse, PenaltyResponse

router = APIRouter(prefix="/penalties", tags=["penalties"])


@router.get("", response_model=PenaltyListResponse)
async def list_penalties(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = PenaltyRepo(db)
    penalties = await repo.list_by_user(current_user.id)
    total = len(penalties)
    page = penalties[skip : skip + limit]
    return PenaltyListResponse(
        penalties=[PenaltyResponse.model_validate(p) for p in page],
        total=total,
    )
