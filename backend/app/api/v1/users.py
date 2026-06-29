from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import get_current_admin
from app.core.pagination import decode_cursor, encode_cursor
from app.models.user import User
from app.schemas.user import (
    ToggleActiveResponse,
    UpdateUserRoleRequest,
    UserAdminResponse,
    UserDetailResponse,
    UserListResponse,
)
from app.services.user_service import UserService, get_user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse, summary="List users (admin)")
async def list_users(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    service: UserService = Depends(get_user_service),
    _: User = Depends(get_current_admin),
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cursor_id = int(decode_cursor(cursor)) if cursor else None
    cache_params = {
        "cursor": cursor,
        "skip": skip,
        "limit": limit,
        "search": search,
        "role": role,
        "is_active": is_active,
    }
    cached = await get_cached_admin_list("users", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return UserListResponse.model_validate(cached)

    raw_users, total = await service.repo.list_users(
        after_id=cursor_id, skip=skip, limit=limit, search=search, role=role, is_active=is_active
    )

    next_cursor = None
    if raw_users and len(raw_users) == limit:
        next_cursor = encode_cursor(raw_users[-1].id)
    result = UserListResponse(
        users=[UserAdminResponse.model_validate(u) for u in raw_users],
        total=total,
        next_cursor=next_cursor,
    )

    await cache_admin_list("users", cache_params, result.model_dump(mode="json"))
    response.headers["X-Cache"] = "MISS"
    return result


@router.get("/{user_id}", response_model=UserDetailResponse, summary="User details (admin)")
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    _: User = Depends(get_current_admin),
):
    return await service.get_user(user_id)


@router.patch(
    "/{user_id}/role", response_model=UserDetailResponse, summary="Change user role (admin)"
)
async def update_user_role(
    user_id: int,
    data: UpdateUserRoleRequest,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.update_role(current_user, user_id, data.role.value)
    await invalidate_admin_list_cache("users")
    return result


@router.patch(
    "/{user_id}/toggle-active",
    response_model=ToggleActiveResponse,
    summary="Toggle user active status (admin)",
)
async def toggle_user_active(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.toggle_active(current_user, user_id)
    await invalidate_admin_list_cache("users")
    return result
