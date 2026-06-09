from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.api.deps import get_current_manager
from app.core.redis_client import get_redis
from app.core.upload import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, save_upload
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/court-image", summary="آپلود تصویر مجموعه")
async def upload_court_image(
    file: UploadFile = File(...),
    request: Request = None,
    _: User = Depends(get_current_manager),
) -> dict:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"نوع فایل .{ext} مجاز نیست")

    relative_url = save_upload(content, file.filename or "image.jpg", subdir="courts")
    base = str(request.base_url).rstrip("/")
    absolute_url = f"{base}{relative_url}"
    temp_id = uuid.uuid4().hex
    r = await get_redis()
    await r.setex(f"temp_upload:{temp_id}", 3600, absolute_url)
    return {"temp_id": temp_id, "url": absolute_url}
