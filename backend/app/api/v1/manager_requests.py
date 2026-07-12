from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.core.database import get_db
from app.models.manager_request import ManagerRequest, ManagerRequestStatus
from app.models.user import User, UserRole
from app.schemas.manager_request import (
    ManagerRequestCreate,
    ManagerRequestListResponse,
    ManagerRequestResponse,
    ManagerRequestStatusUpdate,
)

router = APIRouter(tags=["manager-requests"])


@router.post(
    "/api/v1/manager-requests",
    response_model=ManagerRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_manager_request(
    data: ManagerRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManagerRequest:
    """Submit a request to become a complex manager."""
    if user.role == "manager" or user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شما قبلاً دسترسی مدیر مجموعه را دارید",
        )

    stmt = select(ManagerRequest).where(
        ManagerRequest.user_id == user.id,
        ManagerRequest.status == ManagerRequestStatus.PENDING,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="شما قبلاً یک درخواست ثبت کرده‌اید. در انتظار بررسی ادمین باشید.",
        )

    request = ManagerRequest(
        user_id=user.id,
        vendor_name=data.vendor_name,
        phone=data.phone,
        message=data.message,
        status=ManagerRequestStatus.PENDING,
    )
    db.add(request)
    await db.commit()
    await db.refresh(request)
    return request


@router.get(
    "/api/v1/manager-requests/my",
    response_model=ManagerRequestResponse | None,
)
async def get_my_request(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManagerRequest | None:
    """Get the current user's latest manager request."""
    stmt = (
        select(ManagerRequest)
        .where(ManagerRequest.user_id == user.id)
        .order_by(ManagerRequest.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ── Admin endpoints ───────────────────────────────────────


@router.get(
    "/api/v1/admin/manager-requests",
    response_model=ManagerRequestListResponse,
)
async def list_manager_requests(
    _user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagerRequestListResponse:
    """List all manager requests (admin only)."""
    stmt = select(ManagerRequest).order_by(ManagerRequest.created_at.desc())
    result = await db.execute(stmt)
    requests = [ManagerRequestResponse.model_validate(r) for r in result.scalars().all()]
    return ManagerRequestListResponse(requests=requests)


@router.patch(
    "/api/v1/admin/manager-requests/{request_id}",
    response_model=ManagerRequestResponse,
)
async def update_manager_request_status(
    request_id: int,
    data: ManagerRequestStatusUpdate,
    _user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagerRequest:
    """Approve or reject a manager request (admin only)."""
    stmt = select(ManagerRequest).where(ManagerRequest.id == request_id)
    result = await db.execute(stmt)
    request = result.scalar_one_or_none()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="درخواست یافت نشد",
        )

    new_status = ManagerRequestStatus(data.status)
    request.status = new_status
    request.admin_note = data.admin_note

    if new_status == ManagerRequestStatus.APPROVED:
        user_result = await db.execute(select(User).where(User.id == request.user_id))
        target_user = user_result.scalar_one_or_none()
        if target_user:
            target_user.role = UserRole.MANAGER

    await db.commit()
    await db.refresh(request)
    return request
