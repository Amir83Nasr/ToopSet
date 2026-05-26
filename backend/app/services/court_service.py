from __future__ import annotations
from datetime import datetime

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager, get_current_user_optional
from app.core.database import get_db
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.schemas.court import CourtCreate, CourtResponse, CourtUpdate, CourtListResponse
from app.models.court import SportType


class CourtService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.repo = CourtRepo(db)
        self.current_user = current_user

    async def list_courts(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        sport_type: SportType | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        ref_lat: float | None = None,
        ref_lon: float | None = None,
        max_distance_km: float | None = None,
    ) -> CourtListResponse:
        if self.current_user is None or self.current_user.role not in ("admin", "manager"):
            is_active = True
        courts, total = await self.repo.list(
            skip=skip, limit=limit, sport_type=sport_type, is_active=is_active, search=search,
            date_from=date_from, date_to=date_to, price_min=price_min, price_max=price_max,
            ref_lat=ref_lat, ref_lon=ref_lon, max_distance_km=max_distance_km
        )
        return CourtListResponse(
            courts=[CourtResponse.model_validate(c) for c in courts],
            total=total,
        )

    async def get_court(self, court_id: int) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if not court.is_active and (self.current_user is None or self.current_user.role not in ("admin", "manager")):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        return CourtResponse.model_validate(court)

    async def create_court(self, data: CourtCreate) -> CourtResponse:
        court = await self.repo.create(data.model_dump() | {"manager_id": self.current_user.id})
        return CourtResponse.model_validate(court)

    async def update_court(self, court_id: int, data: CourtUpdate) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your court")
        updated = await self.repo.update(court, data.model_dump(exclude_none=True))
        return CourtResponse.model_validate(updated)

    async def delete_court(self, court_id: int) -> None:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your court")
        await self.repo.delete(court)

    async def toggle_court_status(self, court_id: int, is_active: bool) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't manage this court")
        updated = await self.repo.update(court, {"is_active": is_active})
        return CourtResponse.model_validate(updated)


async def get_court_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
) -> CourtService:
    return CourtService(db=db, current_user=current_user)


async def get_court_service_public(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> CourtService:
    return CourtService(db=db, current_user=current_user)
