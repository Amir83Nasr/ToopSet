"""ParsPack S3-compatible object storage helpers.

All operations are async (aioboto3).  The module is a no-op when the four
PARSPACK_* environment variables are not set — callers should check
``settings.parspack_configured`` before routing through S3.

Public surface
──────────────
    upload_to_s3(content, filename, content_type, prefix) -> str
        Upload *content* under ``<prefix>/<uuid><ext>`` and return the
        public HTTPS URL that was stored.

    delete_from_s3(url_or_key) -> bool
        Delete the object identified by its public URL or raw object key.
        Returns True on success, False when the object does not exist or
        the key cannot be derived from the given value.

    public_url(object_key) -> str
        Build the public HTTPS URL for an object key without uploading.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import PurePosixPath
from urllib.parse import urlparse

import aioboto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── internal helpers ──────────────────────────────────────────────────────────


def _session() -> aioboto3.Session:
    return aioboto3.Session(
        aws_access_key_id=settings.parspack_access_key,
        aws_secret_access_key=settings.parspack_secret_key.get_secret_value(),
    )


def _object_key(prefix: str, original_filename: str, extension: str | None = None) -> str:
    """Return ``<prefix>/<uuid><ext>`` — always uses a fresh UUID."""
    ext = extension or PurePosixPath(original_filename).suffix.lower()
    return f"{prefix.strip('/')}/{uuid.uuid4().hex}{ext}"


def public_url(object_key: str) -> str:
    """Construct the public HTTPS URL for *object_key* in the configured bucket."""
    endpoint = settings.parspack_endpoint_url.rstrip("/")
    bucket = settings.parspack_bucket_name
    return f"{endpoint}/{bucket}/{object_key}"


def _key_from_url(url: str) -> str | None:
    """Extract the object key from a public URL produced by :func:`public_url`.

    Returns *None* when the URL doesn't belong to the configured bucket.
    """
    endpoint = settings.parspack_endpoint_url.rstrip("/")
    bucket = settings.parspack_bucket_name
    prefix = f"{endpoint}/{bucket}/"
    if url.startswith(prefix):
        return url[len(prefix) :]
    # Fallback: parse URL path and strip leading /<bucket>/
    parsed = urlparse(url)
    path = parsed.path.lstrip("/")
    bucket_prefix = f"{bucket}/"
    if path.startswith(bucket_prefix):
        return path[len(bucket_prefix) :]
    return None


# ── public API ────────────────────────────────────────────────────────────────


async def upload_to_s3(
    content: bytes,
    original_filename: str,
    content_type: str,
    prefix: str = "vendors",
) -> str:
    """Upload *content* to ParsPack and return the absolute public URL.

    Parameters
    ----------
    content:
        Raw file bytes.
    original_filename:
        Used only to derive the file extension for the stored object key.
    content_type:
        MIME type set on the stored object (e.g. ``"image/jpeg"``).
    prefix:
        Folder/prefix inside the bucket (default: ``"vendors"``).

    Returns
    -------
    str
        Absolute public URL of the uploaded object.

    Raises
    ------
    RuntimeError
        Wraps any boto3/network error so callers can convert to HTTPException.
    """
    key = _object_key(prefix, original_filename)
    session = _session()

    try:
        async with session.client(
            "s3",
            endpoint_url=settings.parspack_endpoint_url,
            region_name="default",
        ) as s3:
            await s3.put_object(
                Bucket=settings.parspack_bucket_name,
                Key=key,
                Body=content,
                ContentType=content_type,
                ACL="public-read",
            )
    except (BotoCoreError, ClientError) as exc:
        logger.error("S3 upload failed for key=%s: %s", key, exc)
        raise RuntimeError(f"S3 upload failed: {exc}") from exc

    url = public_url(key)
    logger.info("S3 upload succeeded: key=%s url=%s", key, url)
    return url


async def delete_from_s3(url_or_key: str | None) -> bool:
    """Delete an object from ParsPack by its public URL or raw object key.

    Returns True when the delete call completed (object may already have been
    gone), False when the key cannot be determined or an error occurs.
    """
    if not url_or_key:
        return False

    # Determine the actual object key
    if url_or_key.startswith("http://") or url_or_key.startswith("https://"):
        key = _key_from_url(url_or_key)
        if key is None:
            logger.warning("delete_from_s3: cannot derive key from URL %s", url_or_key)
            return False
    else:
        key = url_or_key

    session = _session()
    try:
        async with session.client(
            "s3",
            endpoint_url=settings.parspack_endpoint_url,
            region_name="default",
        ) as s3:
            await s3.delete_object(Bucket=settings.parspack_bucket_name, Key=key)
        logger.info("S3 delete succeeded: key=%s", key)
        return True
    except (BotoCoreError, ClientError) as exc:
        logger.error("S3 delete failed for key=%s: %s", key, exc)
        return False
