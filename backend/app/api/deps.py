from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import auth_cache
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository

security = HTTPBearer(auto_error=False)


async def _fast_path_user(user_id: int, token_ver: int | None) -> User | None:
    """Authorize from the Redis auth-status cache without touching the DB.

    Returns an identity-only ``User`` when the cached status proves the token
    is still valid (account active, ``token_version`` unchanged).  Any other
    outcome — miss, inactive account, version mismatch, malformed payload,
    Redis down — returns ``None`` so the caller falls back to the database,
    which stays the source of truth for *rejections*.

    The returned instance carries only the authorization-relevant columns
    (``id``, ``role``, ``is_active``, ``token_version``).  Handlers and
    services that read profile columns (``full_name``, ``phone``,
    ``password_hash``, ...) or mutate the ORM object must use
    ``get_current_user_fresh`` instead.
    """
    cached = await auth_cache.get_user_status(user_id)
    if cached is None:
        return None
    if not cached["is_active"]:
        return None
    if token_ver is not None and token_ver != cached["token_version"]:
        return None
    try:
        role = UserRole(cached["role"])
    except ValueError:
        return None
    return User(id=user_id, role=role, is_active=True, token_version=cached["token_version"])


async def get_current_user_optional(
    token: str | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if token is None:
        return None
    payload = decode_token(token.credentials, expected_type="access")
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None

    fast_user = await _fast_path_user(int(user_id), payload.get("ver"))
    if fast_user is not None:
        return fast_user

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if user is None or not user.is_active:
        return None
    token_ver = payload.get("ver")
    if token_ver is not None and token_ver != user.token_version:
        return None
    await auth_cache.set_user_status(
        user.id, is_active=user.is_active, token_version=user.token_version, role=user.role.value
    )
    return user


async def get_current_user(
    token: str | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="وارد حساب خود نشده‌اید"
        )

    payload = decode_token(token.credentials, expected_type="access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر یا منقضی شده"
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر است")

    fast_user = await _fast_path_user(int(user_id), payload.get("ver"))
    if fast_user is not None:
        return fast_user

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="حساب کاربری شما غیرفعال شده است"
        )

    # token_version check: only reject if user explicitly bumped it (logout-all / password change)
    token_ver = payload.get("ver")
    if token_ver is not None and token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما به پایان رسید — لطفاً دوباره وارد شوید",
        )

    await auth_cache.set_user_status(
        user.id, is_active=user.is_active, token_version=user.token_version, role=user.role.value
    )
    return user


async def get_current_user_fresh(
    token: str | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """DB-backed variant of ``get_current_user`` (bypasses the auth cache).

    Use in handlers that read profile columns off the user object
    (``full_name``, ``phone``, ``password_hash``, ``avatar_url``, ...) or
    mutate it through the ORM session — the cached fast path returns an
    identity-only instance those handlers cannot rely on.
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="وارد حساب خود نشده‌اید"
        )

    payload = decode_token(token.credentials, expected_type="access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر یا منقضی شده"
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر است")

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="حساب کاربری شما غیرفعال شده است"
        )

    # token_version check: only reject if user explicitly bumped it (logout-all / password change)
    token_ver = payload.get("ver")
    if token_ver is not None and token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما به پایان رسید — لطفاً دوباره وارد شوید",
        )

    return user


async def get_current_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی مدیر مجموعه یا ادمین لازم است"
        )
    return current_user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی ادمین لازم است")
    return current_user
