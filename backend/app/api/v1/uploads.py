from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_manager
from app.core.upload import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, save_upload
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/court-image")
async def upload_court_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_manager),
) -> dict:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type: .{ext}")

    url = save_upload(content, file.filename or "image.jpg")
    return {"url": url}
