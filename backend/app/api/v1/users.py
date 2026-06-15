from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_admin
from app.models.user import User
from app.schemas.user import (
    ToggleActiveResponse,
    UpdateUserRoleRequest,
    UserDetailResponse,
    UserListResponse,
)
from app.services.user_service import UserService, get_user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse, summary="List users (admin)")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    service: UserService = Depends(get_user_service),
    _: User = Depends(get_current_admin),
):
    return await service.list_users(
        skip=skip, limit=limit, search=search, role=role, is_active=is_active
    )


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
    return await service.update_role(current_user, user_id, data.role.value)


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
    return await service.toggle_active(current_user, user_id)
