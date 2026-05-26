from __future__ import annotations

import uuid
from pathlib import Path

UPLOAD_DIR = Path("uploads/courts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def save_upload(file_content: bytes, original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file extension: {ext}")
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(file_content)
    return f"/uploads/courts/{filename}"
