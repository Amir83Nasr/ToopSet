from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.favorite import FavoriteCheckResponse, FavoriteResponse
from app.services.favorite_service import FavoriteService

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteResponse])
async def list_favorites(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    return await service.list_favorites(skip=skip, limit=limit)


@router.get("/check", response_model=FavoriteCheckResponse)
async def check_favorites(
    court_ids: str = Query(..., description="Comma-separated court IDs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = [int(x.strip()) for x in court_ids.split(",") if x.strip()]
    service = FavoriteService(db=db, current_user=current_user)
    favorited = await service.check_favorites(ids)
    return FavoriteCheckResponse(favorited_court_ids=favorited)


@router.post("/{court_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    return await service.add_favorite(court_id)


@router.delete("/{court_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    await service.remove_favorite(court_id)
