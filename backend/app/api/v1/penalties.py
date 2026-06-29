from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.pagination import decode_cursor, encode_cursor
from app.models.user import User
from app.repositories.penalty_repo import PenaltyRepo
from app.schemas.penalty import PenaltyListResponse, PenaltyResponse

router = APIRouter(prefix="/penalties", tags=["penalties"])


@router.get("", response_model=PenaltyListResponse, summary="List penalties")
async def list_penalties(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    repo = PenaltyRepo(db)
    penalties, total = await repo.list_by_user(
        current_user.id, after_id=cursor_id, skip=skip, limit=limit
    )
    next_cursor = None
    if penalties and len(penalties) == limit:
        next_cursor = encode_cursor(penalties[-1].id)
    return PenaltyListResponse(
        penalties=[PenaltyResponse.model_validate(p) for p in penalties],
        total=total,
        next_cursor=next_cursor,
    )
