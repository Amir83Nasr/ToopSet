from __future__ import annotations

import uuid
from pathlib import Path

BASE_UPLOAD_DIR = Path("uploads")
BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Magic bytes signatures for MIME validation
_MIME_SIGNATURES: dict[tuple[int, ...], str] = {
    (0xFF, 0xD8, 0xFF): "image/jpeg",
    (0x89, 0x50, 0x4E, 0x47): "image/png",
    (0x52, 0x49, 0x46, 0x46): "image/webp",  # RIFF header, verified below
}


def _detect_mime(content: bytes) -> str | None:
    if len(content) < 4:
        return None
    for signature, mime in _MIME_SIGNATURES.items():
        slen = len(signature)
        if len(content) < slen:
            continue
        if content[:slen] == bytes(signature):
            if mime == "image/webp":
                if len(content) >= 12 and content[8:12] == b"WEBP":
                    return mime
                return None
            return mime
    return None


_ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}


def save_upload(file_content: bytes, original_filename: str, subdir: str = "courts") -> str:
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file extension: {ext}")

    mime = _detect_mime(file_content)
    if mime not in _ALLOWED_MIMES:
        raise ValueError(f"Invalid file content type: {mime or 'unknown'}")

    upload_dir = BASE_UPLOAD_DIR / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = upload_dir / filename
    filepath.write_bytes(file_content)
    return f"/uploads/{subdir}/{filename}"


def delete_upload(relative_path: str | None) -> bool:
    if not relative_path:
        return False
    try:
        # Handle both relative (/uploads/avatars/uuid.jpg) and absolute
        # (http://localhost:8000/uploads/avatars/uuid.jpg) URLs
        path = relative_path
        if "://" in path:
            from urllib.parse import urlparse

            path = urlparse(path).path
        # Strip leading /uploads/ since BASE_UPLOAD_DIR already resolves to uploads/
        rel = path.lstrip("/")
        if rel.startswith("uploads/"):
            rel = rel[len("uploads/") :]
        filepath = BASE_UPLOAD_DIR / rel
        if filepath.exists() and filepath.is_file():
            filepath.unlink()
            return True
        return False
    except OSError:
        return False
