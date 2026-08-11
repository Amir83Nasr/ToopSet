from __future__ import annotations

import uuid
from pathlib import Path

from app.core.config import settings

# Resolve relative to this file, not the process CWD — the app must work
# regardless of the working directory (FastAPI Cloud runs from /app/backend).
BASE_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
# SVG is intentionally not accepted for runtime uploads. Serving an attacker-
# controlled SVG from the application's own origin creates an avoidable active-
# content/XSS surface. Repository-owned SVG assets remain unaffected.
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Magic bytes signatures for MIME validation
_MIME_SIGNATURES: dict[tuple[int, ...], str] = {
    (0xFF, 0xD8, 0xFF): "image/jpeg",
    (0x89, 0x50, 0x4E, 0x47): "image/png",
    (0x52, 0x49, 0x46, 0x46): "image/webp",  # RIFF header, verified below
    # SVG: no fixed magic bytes — detected via text content in _detect_mime
}

_SVG_XML_HEAD = b"<?xml"
_SVG_HEAD = b"<svg"


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
    # SVG detection: check for XML/SVG text header
    stripped = content.lstrip()
    if stripped.startswith(_SVG_XML_HEAD) or stripped.startswith(_SVG_HEAD):
        # Rough check: look for <svg tag somewhere in first 8KB
        if b"<svg" in content[:8192]:
            return "image/svg+xml"
    return None


_ALLOWED_MIMES_BY_EXT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


def validate_upload_content(file_content: bytes, original_filename: str) -> str:
    """Validate extension and magic bytes. Returns the safe lowercase extension."""
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file extension: {ext}")
    mime = _detect_mime(file_content)
    expected_mime = _ALLOWED_MIMES_BY_EXT[ext]
    if mime != expected_mime:
        raise ValueError(f"Invalid file content type: {mime or 'unknown'}")
    return ext


def save_upload(file_content: bytes, original_filename: str, subdir: str = "vendors") -> str:
    ext = validate_upload_content(file_content, original_filename)

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
        upload_root = BASE_UPLOAD_DIR.resolve()
        filepath = (upload_root / rel).resolve()
        try:
            filepath.relative_to(upload_root)
        except ValueError:
            return False
        if filepath.exists() and filepath.is_file():
            filepath.unlink()
            return True
        return False
    except OSError:
        return False


# ── S3-aware async variants ───────────────────────────────────────────────────
# These helpers transparently route to ParsPack S3 when all four PARSPACK_*
# environment variables are set, otherwise they fall back to local disk so that
# local development and existing tests require no changes.


async def save_upload_async(
    file_content: bytes,
    original_filename: str,
    subdir: str = "vendors",
) -> str:
    """Validate, then persist the upload on S3 (if configured) or local disk.

    Returns an absolute public URL when S3 is active, or a root-relative path
    (``/uploads/<subdir>/<uuid>.<ext>``) for local-disk storage.
    """
    ext = validate_upload_content(file_content, original_filename)
    mime = _ALLOWED_MIMES_BY_EXT[ext]

    if settings.parspack_configured:
        from app.core.s3_service import upload_to_s3

        return await upload_to_s3(
            content=file_content,
            original_filename=original_filename,
            content_type=mime,
            prefix=subdir,
        )

    # Local disk fallback (synchronous write is fine for small images)
    return save_upload(file_content, original_filename, subdir=subdir)


async def delete_upload_async(url_or_path: str | None) -> bool:
    """Delete an upload from S3 (if it looks like an S3 URL) or local disk."""
    if not url_or_path:
        return False

    if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
        if settings.parspack_configured:
            from app.core.s3_service import delete_from_s3

            return await delete_from_s3(url_or_path)
        return False  # http URL but S3 not configured — nothing we can do

    return delete_upload(url_or_path)
