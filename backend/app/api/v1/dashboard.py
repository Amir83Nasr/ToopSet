from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.dashboard_service import DashboardService, DashboardStats
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    service: DashboardService = Depends(get_dashboard_service),
    _: User = Depends(get_current_user),
):
    return await service.get_stats()
