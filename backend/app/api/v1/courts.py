from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.date_utils import parse_date_filter, parse_date_filter_end
from app.models.court import Court, SportType
from app.models.court_image import CourtImage
from app.models.user import User
from app.schemas.court import (
    CourtCreate,
    CourtImageResponse,
    CourtListResponse,
    CourtResponse,
    CourtUpdate,
)
from app.schemas.review import ReviewListResponse
from app.services.court_service import CourtService, get_court_service, get_court_service_public
from app.services.review_service import ReviewService

router = APIRouter(prefix="/courts", tags=["courts"])


@router.get("", response_model=CourtListResponse)
async def list_courts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sport_type: SportType | None = None,
    search: str | None = None,
    is_active: bool | None = None,
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    price_min: float | None = None,
    price_max: float | None = None,
    ref_lat: float | None = None,
    ref_lon: float | None = None,
    max_distance_km: float | None = None,
    sort: str | None = Query("default", enum=["default", "price_asc", "price_desc", "rating"]),
    service: CourtService = Depends(get_court_service_public),
):
    return await service.list_courts(
        skip=skip,
        limit=limit,
        sport_type=sport_type,
        search=search,
        is_active=is_active,
        date_from=parse_date_filter(date_from) if date_from else None,
        date_to=parse_date_filter_end(date_to) if date_to else None,
        price_min=price_min,
        price_max=price_max,
        ref_lat=ref_lat,
        ref_lon=ref_lon,
        max_distance_km=max_distance_km,
        sort=sort or "default",
    )


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
    service: CourtService = Depends(get_court_service_public),
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
    _: User = Depends(get_current_manager),
):
    await service.delete_court(court_id)


# ── Image management ─────────────────────────────────────────────


@router.post("/{court_id}/images", response_model=CourtImageResponse, status_code=201)
async def upload_court_image(
    court_id: int,
    url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    court = await db.get(Court, court_id)
    if not court:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    if court.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    max_order = await db.scalar(
        select(CourtImage.order)
        .where(CourtImage.court_id == court_id)
        .order_by(CourtImage.order.desc())
        .limit(1)
    )
    next_order = (max_order or -1) + 1
    img = CourtImage(court_id=court_id, url=url, order=next_order)
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return CourtImageResponse.model_validate(img)


@router.delete("/{court_id}/images/{image_id}", status_code=204)
async def delete_court_image(
    court_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    court = await db.get(Court, court_id)
    if not court:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Court not found")
    if court.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    img = await db.get(CourtImage, image_id)
    if not img or img.court_id != court_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="تصویر یافت نشد")
    await db.delete(img)
    await db.commit()


@router.put("/{court_id}/images/reorder", status_code=204)
async def reorder_court_images(
    court_id: int,
    ordered_ids: list[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    court = await db.get(Court, court_id)
    if not court:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Court not found")
    if court.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    for idx, img_id in enumerate(ordered_ids):
        await db.execute(
            select(CourtImage).where(CourtImage.id == img_id, CourtImage.court_id == court_id)
        )
        img = await db.get(CourtImage, img_id)
        if img and img.court_id == court_id:
            img.order = idx
    await db.commit()
