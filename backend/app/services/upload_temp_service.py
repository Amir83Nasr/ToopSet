from __future__ import annotations

import json
import time
from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.core.upload import delete_upload_async

TEMP_UPLOAD_TTL_SECONDS = 3600
TEMP_UPLOAD_GRACE_SECONDS = 3600
TEMP_UPLOAD_GC_SET = "temp_upload_gc"


def _key(temp_id: str) -> str:
    return f"temp_upload:{temp_id}"


async def store_temp_upload(redis, *, temp_id: str, user_id: int, path: str) -> None:
    now = datetime.now(UTC)
    expires_at = time.time() + TEMP_UPLOAD_TTL_SECONDS
    payload = {
        "user_id": user_id,
        "path": path,
        "created_at": now.isoformat(),
        "expires_at": datetime.fromtimestamp(expires_at, UTC).isoformat(),
    }
    await redis.setex(
        _key(temp_id),
        TEMP_UPLOAD_TTL_SECONDS + TEMP_UPLOAD_GRACE_SECONDS,
        json.dumps(payload),
    )
    await redis.zadd(TEMP_UPLOAD_GC_SET, {temp_id: expires_at})


async def consume_temp_uploads(redis, *, temp_ids: list[str], user_id: int) -> list[str]:
    uploads: list[tuple[str, str]] = []

    for temp_id in temp_ids:
        raw = await redis.get(_key(temp_id))
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"تصویر با شناسه {temp_id} منقضی شده است. لطفاً دوباره آپلود کنید.",
            )
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"تصویر با شناسه {temp_id} معتبر نیست.",
            )

        if payload.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="شما به این تصویر دسترسی ندارید",
            )
        path = payload.get("path")
        if not isinstance(path, str) or not (
            path.startswith("/uploads/")
            or path.startswith("https://")
            or path.startswith("http://")
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"تصویر با شناسه {temp_id} معتبر نیست.",
            )
        uploads.append((temp_id, path))

    for temp_id, _ in uploads:
        await redis.delete(_key(temp_id))
        await redis.zrem(TEMP_UPLOAD_GC_SET, temp_id)

    return [path for _, path in uploads]


async def cleanup_orphan_temp_uploads(redis) -> int:
    expired_ids = await redis.zrangebyscore(TEMP_UPLOAD_GC_SET, 0, time.time())
    cleaned = 0

    for temp_id in expired_ids:
        raw = await redis.get(_key(temp_id))
        if raw:
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {}
            path = payload.get("path")
            if isinstance(path, str):
                await delete_upload_async(path)
                cleaned += 1
            await redis.delete(_key(temp_id))
        await redis.zrem(TEMP_UPLOAD_GC_SET, temp_id)

    return cleaned
