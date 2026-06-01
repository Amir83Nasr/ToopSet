from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.dashboard_service import (
    AdminStats,
    DashboardService,
    DashboardStats,
    ManagerStats,
    UserStats,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_user),
):
    return await service.get_stats()


@router.get("/manager/revenue")
async def get_manager_revenue(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("manager", "admin"):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin role required"
        )
    return await service.get_revenue_report(current_user.id, date_from=date_from, date_to=date_to)


@router.get("/admin-stats", response_model=AdminStats)
async def get_admin_stats(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    return await service.get_admin_stats(date_from=date_from, date_to=date_to)


@router.get("/manager-stats", response_model=ManagerStats)
async def get_manager_stats(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("manager", "admin"):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin role required"
        )
    return await service.get_manager_stats(current_user.id)


@router.get("/admin/monthly-recap")
async def get_monthly_recap(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    return await service.get_monthly_recap()


@router.get("/admin/charts")
async def get_admin_charts(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    return await service.get_admin_charts()


@router.get("/user-stats", response_model=UserStats)
async def get_user_stats(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_user_stats(current_user.id)
