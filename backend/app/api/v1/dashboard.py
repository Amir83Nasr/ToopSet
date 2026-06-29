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


@router.get("/stats", response_model=DashboardStats, summary="General dashboard stats")
async def get_stats(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_user),
):
    from app.services.cache_service import cache_response, get_cached_response

    cached = await get_cached_response("dashboard:stats", {})
    if cached is not None:
        return DashboardStats.model_validate(cached)

    result = await service.get_stats()
    await cache_response("dashboard:stats", {}, result.model_dump(mode="json"))
    return result


@router.get("/manager/revenue", summary="Manager revenue report")
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
    from app.services.cache_service import cache_response, get_cached_response

    cache_params = {
        "user_id": current_user.id,
        "date_from": str(date_from) if date_from else None,
        "date_to": str(date_to) if date_to else None,
    }
    cached = await get_cached_response("dashboard:revenue", cache_params)
    if cached is not None:
        return cached

    result = await service.get_revenue_report(current_user.id, date_from=date_from, date_to=date_to)
    await cache_response("dashboard:revenue", cache_params, result)
    return result


@router.get("/admin-stats", response_model=AdminStats, summary="Admin statistics")
async def get_admin_stats(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import cache_response, get_cached_response

    cache_params = {
        "date_from": str(date_from) if date_from else None,
        "date_to": str(date_to) if date_to else None,
    }
    cached = await get_cached_response("dashboard:admin_stats", cache_params)
    if cached is not None:
        return AdminStats.model_validate(cached)

    result = await service.get_admin_stats(date_from=date_from, date_to=date_to)
    await cache_response("dashboard:admin_stats", cache_params, result.model_dump(mode="json"))
    return result


@router.get("/manager-stats", response_model=ManagerStats, summary="Manager statistics")
async def get_manager_stats(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("manager", "admin"):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin role required"
        )
    from app.services.cache_service import cache_response, get_cached_response

    cache_params = {"user_id": current_user.id}
    cached = await get_cached_response("dashboard:manager_stats", cache_params)
    if cached is not None:
        return ManagerStats.model_validate(cached)

    result = await service.get_manager_stats(current_user.id)
    await cache_response("dashboard:manager_stats", cache_params, result.model_dump(mode="json"))
    return result


@router.get("/admin/monthly-recap", summary="Monthly recap (admin)")
async def get_monthly_recap(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import cache_response, get_cached_response

    cached = await get_cached_response("dashboard:monthly_recap", {})
    if cached is not None:
        return cached

    result = await service.get_monthly_recap()
    await cache_response("dashboard:monthly_recap", {}, result)
    return result


@router.get("/admin/charts", summary="Chart data (admin)")
async def get_admin_charts(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import cache_response, get_cached_response

    cached = await get_cached_response("dashboard:charts", {})
    if cached is not None:
        return cached

    result = await service.get_admin_charts()
    await cache_response("dashboard:charts", {}, result)
    return result


@router.get("/user-stats", response_model=UserStats, summary="User statistics")
async def get_user_stats(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
):
    from app.services.cache_service import cache_response, get_cached_response

    cache_params = {"user_id": current_user.id}
    cached = await get_cached_response("dashboard:user_stats", cache_params)
    if cached is not None:
        return UserStats.model_validate(cached)

    result = await service.get_user_stats(current_user.id)
    await cache_response("dashboard:user_stats", cache_params, result.model_dump(mode="json"))
    return result
