from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.date_utils import parse_date_filter, parse_date_filter_end
from app.core.pagination import decode_cursor
from app.core.upload import delete_upload
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


@router.get("", response_model=CourtListResponse, summary="List sports courts")
async def list_courts(
    cursor: str | None = Query(None, description="Cursor for next page (from previous response)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sport_types: list[SportType] | None = Query(None),
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
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    # Build cache params only from filter keys (skip/limit affect pagination)
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    cache_params = {
        "cursor": cursor,
        "skip": skip,
        "limit": limit,
        "sport_types": [st.value for st in sport_types] if sport_types else None,
        "search": search,
        "is_active": is_active,
        "date_from": date_from,
        "date_to": date_to,
        "price_min": price_min,
        "price_max": price_max,
        "ref_lat": ref_lat,
        "ref_lon": ref_lon,
        "max_distance_km": max_distance_km,
        "sort": sort,
    }
    cached = await get_cached_admin_list("courts", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return CourtListResponse.model_validate(cached)

    result = await service.list_courts(
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        sport_types=sport_types,
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
    await cache_admin_list("courts", cache_params, result.model_dump(mode="json"))
    response.headers["X-Cache"] = "MISS"
    return result


@router.get("/{court_id}/reviews", response_model=ReviewListResponse, summary="Court reviews")
async def list_court_reviews(
    court_id: int,
    cursor: str | None = Query(None, description="Cursor for next page (from previous response)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    service = ReviewService(db=db, current_user=None)
    return await service.list_by_court(court_id, after_id=cursor_id, skip=skip, limit=limit)


@router.get("/{court_id}", response_model=CourtResponse, summary="Get court details")
async def get_court(
    court_id: int,
    service: CourtService = Depends(get_court_service_public),
):
    return await service.get_court(court_id)


@router.post(
    "",
    response_model=CourtResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new court",
)
async def create_court(
    data: CourtCreate,
    service: CourtService = Depends(get_court_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.create_court(data)
    await invalidate_admin_list_cache("courts")
    return result


@router.patch("/{court_id}", response_model=CourtResponse, summary="Update court")
async def update_court(
    court_id: int,
    data: CourtUpdate,
    service: CourtService = Depends(get_court_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.update_court(court_id, data)
    await invalidate_admin_list_cache("courts")
    return result


@router.delete("/{court_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete court")
async def delete_court(
    court_id: int,
    service: CourtService = Depends(get_court_service),
    _: User = Depends(get_current_manager),
):
    from app.services.cache_service import invalidate_admin_list_cache

    await service.delete_court(court_id)
    await invalidate_admin_list_cache("courts")


# ── Image management ─────────────────────────────────────────────


@router.post(
    "/{court_id}/images",
    response_model=CourtImageResponse,
    status_code=201,
    summary="Add court image",
)
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


@router.delete("/{court_id}/images/{image_id}", status_code=204, summary="Delete court image")
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
    delete_upload(img.url)
    await db.delete(img)
    await db.commit()


@router.put("/{court_id}/images/reorder", status_code=204, summary="Reorder court images")
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
