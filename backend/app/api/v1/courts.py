from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.models.user import User
from app.models.court import SportType
from app.schemas.court import CourtCreate, CourtListResponse, CourtResponse, CourtUpdate
from app.core.database import get_db
from app.schemas.review import ReviewListResponse
from app.services.court_service import CourtService, get_court_service
from app.services.review_service import ReviewService

router = APIRouter(prefix="/courts", tags=["courts"])


@router.get("", response_model=CourtListResponse)
async def list_courts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sport_type: SportType | None = None,
    service: CourtService = Depends(get_court_service),
):
    return await service.list_courts(skip=skip, limit=limit, sport_type=sport_type)


@router.get("/{court_id}/reviews", response_model=ReviewListResponse)
async def list_court_reviews(
    court_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db=db, current_user=None)
    return await service.list_by_court(court_id, skip=skip, limit=limit)


@router.get("/{court_id}", response_model=CourtResponse)
async def get_court(
    court_id: int,
    service: CourtService = Depends(get_court_service),
):
    return await service.get_court(court_id)


@router.post("", response_model=CourtResponse, status_code=status.HTTP_201_CREATED)
async def create_court(
    data: CourtCreate,
    service: CourtService = Depends(get_court_service),
):
    return await service.create_court(data)


@router.patch("/{court_id}", response_model=CourtResponse)
async def update_court(
    court_id: int,
    data: CourtUpdate,
    service: CourtService = Depends(get_court_service),
):
    return await service.update_court(court_id, data)


@router.delete("/{court_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_court(
    court_id: int,
    service: CourtService = Depends(get_court_service),
    _: User = Depends(get_current_admin),
):
    await service.delete_court(court_id)
