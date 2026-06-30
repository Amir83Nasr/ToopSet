from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.favorite import FavoriteCheckResponse, FavoriteResponse
from app.services.favorite_service import FavoriteService

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteResponse], summary="List favorites")
async def list_favorites(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    return await service.list_favorites(skip=skip, limit=limit)


@router.get(
    "/check", response_model=FavoriteCheckResponse, summary="Check favorite status for vendors"
)
async def check_favorites(
    vendor_ids: str | None = Query(None, description="Comma-separated vendor IDs"),
    court_ids: str | None = Query(None, description="Legacy comma-separated vendor IDs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw_ids = vendor_ids or court_ids
    if raw_ids is None:
        raise HTTPException(status_code=400, detail="vendor_ids is required")
    ids = [int(x.strip()) for x in raw_ids.split(",") if x.strip()]
    service = FavoriteService(db=db, current_user=current_user)
    favorited = await service.check_favorites(ids)
    return FavoriteCheckResponse(favorited_vendor_ids=favorited, favorited_court_ids=favorited)


@router.post(
    "/{vendor_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add to favorites",
)
async def add_favorite(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    return await service.add_favorite(vendor_id)


@router.delete(
    "/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove from favorites"
)
async def remove_favorite(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FavoriteService(db=db, current_user=current_user)
    await service.remove_favorite(vendor_id)
