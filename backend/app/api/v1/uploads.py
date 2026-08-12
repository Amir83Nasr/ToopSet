from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.core.redis_client import get_redis
from app.core.upload import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, save_upload_async
from app.models.user import User
from app.models.vendor import Vendor
from app.models.vendor_image import VendorImage
from app.schemas.vendor import VendorImageResponse
from app.services.upload_temp_service import store_temp_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/court-image", summary="Upload vendor image", include_in_schema=False)
@router.post("/vendor-image", summary="Upload vendor image")
@limiter.limit("10/minute")
async def upload_vendor_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_manager),
) -> dict:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"نوع فایل .{ext} مجاز نیست")

    try:
        image_url = await save_upload_async(content, file.filename or "image.jpg", subdir="vendors")
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    response_url = image_url
    if image_url.startswith("/"):
        base = str(request.base_url).rstrip("/")
        response_url = f"{base}{image_url}"
    temp_id = uuid.uuid4().hex
    r = await get_redis()
    await store_temp_upload(
        r,
        temp_id=temp_id,
        user_id=current_user.id,
        path=image_url,
    )
    return {"temp_id": temp_id, "url": response_url}


# ── Direct S3 upload — vendor image ──────────────────────────────────────────


@router.post(
    "/vendors/{vendor_id}/upload-image",
    response_model=VendorImageResponse,
    status_code=201,
    summary="Upload and attach a vendor image directly to S3",
)
@limiter.limit("10/minute")
async def upload_vendor_image_s3(
    vendor_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
) -> VendorImage:
    """Upload an image for *vendor_id* directly to ParsPack S3 (or local disk
    when S3 is not configured) and persist the public URL in ``vendor_images``.

    Accepted MIME types: ``image/jpeg``, ``image/png``, ``image/webp``.
    Maximum file size: 5 MB.
    """
    # ── ownership check ───────────────────────────────────────────────────────
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    if vendor.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")

    # ── read & validate ───────────────────────────────────────────────────────
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="حجم فایل بیش از حد مجاز است")

    original_filename = file.filename or "image.jpg"
    ext = original_filename.rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"نوع فایل .{ext} مجاز نیست")

    # ── upload (S3 or local disk) ─────────────────────────────────────────────
    try:
        image_url = await save_upload_async(content, original_filename, subdir="vendors")
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # ── persist VendorImage row ───────────────────────────────────────────────
    max_order = await db.scalar(
        select(VendorImage.order)
        .where(VendorImage.vendor_id == vendor_id)
        .order_by(VendorImage.order.desc())
        .limit(1)
    )
    next_order = (max_order or -1) + 1
    img = VendorImage(vendor_id=vendor_id, url=image_url, order=next_order)
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return img
