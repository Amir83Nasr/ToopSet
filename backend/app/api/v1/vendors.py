from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.date_utils import parse_date_filter, parse_date_filter_end
from app.core.pagination import decode_cursor
from app.core.upload import delete_upload
from app.models.user import User
from app.models.vendor import SportType, Vendor
from app.models.vendor_image import VendorImage
from app.schemas.review import ReviewListResponse
from app.schemas.vendor import (
    VendorCreate,
    VendorImageResponse,
    VendorListResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services.review_service import ReviewService
from app.services.vendor_service import VendorService, get_vendor_service, get_vendor_service_public

router = APIRouter(prefix="/vendors", tags=["vendors"])
legacy_router = APIRouter(prefix="/courts", tags=["vendors"], include_in_schema=False)


@legacy_router.get("", response_model=VendorListResponse, summary="List sports vendors")
@router.get("", response_model=VendorListResponse, summary="List sports vendors")
async def list_vendors(
    cursor: str | None = Query(None, description="Cursor for next page (from previous response)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sport_types: list[SportType] | None = Query(None),
    sport_type: SportType | None = Query(
        None, description="Backward-compatible single sport filter"
    ),
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
    service: VendorService = Depends(get_vendor_service_public),
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
        "sport_type": sport_type.value if sport_type else None,
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
    cached = await get_cached_admin_list("vendors", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return VendorListResponse.model_validate(cached)

    effective_sport_types = sport_types or ([sport_type] if sport_type else None)

    result = await service.list_vendors(
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        sport_types=effective_sport_types,
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
    await cache_admin_list("vendors", cache_params, result.model_dump(mode="json"))
    response.headers["X-Cache"] = "MISS"
    return result


@legacy_router.get(
    "/{vendor_id}/reviews", response_model=ReviewListResponse, summary="Vendor reviews"
)
@router.get("/{vendor_id}/reviews", response_model=ReviewListResponse, summary="Vendor reviews")
async def list_vendor_reviews(
    vendor_id: int,
    cursor: str | None = Query(None, description="Cursor for next page (from previous response)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    service = ReviewService(db=db, current_user=None)
    return await service.list_by_vendor(vendor_id, after_id=cursor_id, skip=skip, limit=limit)


@legacy_router.get("/{vendor_id}", response_model=VendorResponse, summary="Get vendor details")
@router.get("/{vendor_id}", response_model=VendorResponse, summary="Get vendor details")
async def get_vendor(
    vendor_id: int,
    service: VendorService = Depends(get_vendor_service_public),
):
    return await service.get_vendor(vendor_id)


@legacy_router.post(
    "",
    response_model=VendorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new vendor",
)
@router.post(
    "",
    response_model=VendorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new vendor",
)
async def create_vendor(
    data: VendorCreate,
    service: VendorService = Depends(get_vendor_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.create_vendor(data)
    await invalidate_admin_list_cache("vendors")
    return result


@legacy_router.patch("/{vendor_id}", response_model=VendorResponse, summary="Update vendor")
@router.patch("/{vendor_id}", response_model=VendorResponse, summary="Update vendor")
async def update_vendor(
    vendor_id: int,
    data: VendorUpdate,
    service: VendorService = Depends(get_vendor_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.update_vendor(vendor_id, data)
    await invalidate_admin_list_cache("vendors")
    return result


@legacy_router.delete(
    "/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete vendor"
)
@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete vendor")
async def delete_vendor(
    vendor_id: int,
    service: VendorService = Depends(get_vendor_service),
    _: User = Depends(get_current_manager),
):
    from app.services.cache_service import invalidate_admin_list_cache

    await service.delete_vendor(vendor_id)
    await invalidate_admin_list_cache("vendors")


# ── Image management ─────────────────────────────────────────────


@legacy_router.post(
    "/{vendor_id}/images",
    response_model=VendorImageResponse,
    status_code=201,
    summary="Add vendor image",
)
@router.post(
    "/{vendor_id}/images",
    response_model=VendorImageResponse,
    status_code=201,
    summary="Add vendor image",
)
async def upload_vendor_image(
    vendor_id: int,
    url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    if vendor.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    max_order = await db.scalar(
        select(VendorImage.order)
        .where(VendorImage.vendor_id == vendor_id)
        .order_by(VendorImage.order.desc())
        .limit(1)
    )
    next_order = (max_order or -1) + 1
    img = VendorImage(vendor_id=vendor_id, url=url, order=next_order)
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return VendorImageResponse.model_validate(img)


@legacy_router.delete(
    "/{vendor_id}/images/{image_id}", status_code=204, summary="Delete vendor image"
)
@router.delete("/{vendor_id}/images/{image_id}", status_code=204, summary="Delete vendor image")
async def delete_vendor_image(
    vendor_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    if vendor.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    img = await db.get(VendorImage, image_id)
    if not img or img.vendor_id != vendor_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="تصویر یافت نشد")
    delete_upload(img.url)
    await db.delete(img)
    await db.commit()


@legacy_router.put("/{vendor_id}/images/reorder", status_code=204, summary="Reorder vendor images")
@router.put("/{vendor_id}/images/reorder", status_code=204, summary="Reorder vendor images")
async def reorder_vendor_images(
    vendor_id: int,
    ordered_ids: list[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    if vendor.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
    for idx, img_id in enumerate(ordered_ids):
        await db.execute(
            select(VendorImage).where(VendorImage.id == img_id, VendorImage.vendor_id == vendor_id)
        )
        img = await db.get(VendorImage, img_id)
        if img and img.vendor_id == vendor_id:
            img.order = idx
    await db.commit()
