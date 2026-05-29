from __future__ import annotations

from datetime import datetime
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.court import Court, SportType
from app.models.time_slot import TimeSlot


class CourtRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return R * c

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        sport_type: SportType | None = None,
        is_active: bool | None = True,
        search: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        ref_lat: float | None = None,
        ref_lon: float | None = None,
        max_distance_km: float | None = None,
        sort: str = "default",
    ) -> tuple[list[Court], int]:
        query = select(Court)
        count_query = select(Court.id)

        if sport_type:
            query = query.where(Court.sport_types.any(sport_type.value))
            count_query = count_query.where(Court.sport_types.any(sport_type.value))
        if is_active is not None:
            query = query.where(Court.is_active == is_active)
            count_query = count_query.where(Court.is_active == is_active)
        if search:
            pattern = f"%{search}%"
            query = query.where(Court.name.ilike(pattern))
            count_query = count_query.where(Court.name.ilike(pattern))

        # Date/price filters: join with time_slots to find courts with available slots
        if date_from or date_to or price_min is not None or price_max is not None:
            query = query.join(Court.time_slots).where(TimeSlot.is_reserved == False)
            count_query = count_query.join(Court.time_slots).where(TimeSlot.is_reserved == False)

            if date_from:
                query = query.where(TimeSlot.start_time >= date_from)
                count_query = count_query.where(TimeSlot.start_time >= date_from)
            if date_to:
                query = query.where(TimeSlot.end_time <= date_to)
                count_query = count_query.where(TimeSlot.end_time <= date_to)
            if price_min is not None:
                query = query.where(TimeSlot.base_price >= price_min)
                count_query = count_query.where(TimeSlot.base_price >= price_min)
            if price_max is not None:
                query = query.where(TimeSlot.base_price <= price_max)
                count_query = count_query.where(TimeSlot.base_price <= price_max)

            query = query.distinct()

        from sqlalchemy import func as sa_func

        count_q = select(sa_func.count()).select_from(Court)
        if sport_type:
            count_q = count_q.where(Court.sport_types.any(sport_type.value))
        if is_active is not None:
            count_q = count_q.where(Court.is_active == is_active)
        if search:
            count_q = count_q.where(Court.name.ilike(f"%{search}%"))

        if date_from or date_to or price_min is not None or price_max is not None:
            count_q = count_q.join(Court.time_slots).where(TimeSlot.is_reserved == False)
            if date_from:
                count_q = count_q.where(TimeSlot.start_time >= date_from)
            if date_to:
                count_q = count_q.where(TimeSlot.end_time <= date_to)
            if price_min is not None:
                count_q = count_q.where(TimeSlot.base_price >= price_min)
            if price_max is not None:
                count_q = count_q.where(TimeSlot.base_price <= price_max)

        total = (await self.db.execute(count_q)).scalar_one()

        order = Court.created_at.desc()
        if sort in ("price_asc", "price_desc"):
            price_subq = (
                select(func.min(TimeSlot.base_price))
                .where(TimeSlot.court_id == Court.id, TimeSlot.is_reserved == False)
                .correlate(Court)
                .scalar_subquery()
            )
            query = query.add_columns(price_subq)
            order = price_subq.asc() if sort == "price_asc" else price_subq.desc()
        elif sort == "rating":
            order = Court.average_rating.desc()

        result = await self.db.execute(query.offset(skip).limit(limit).order_by(order))
        courts = list(result.scalars().all())

        # Distance filter (in-memory Haversine)
        if ref_lat is not None and ref_lon is not None and max_distance_km is not None:
            filtered = []
            for c in courts:
                if c.latitude is not None and c.longitude is not None:
                    d = self._haversine_km(ref_lat, ref_lon, c.latitude, c.longitude)
                    if d <= max_distance_km:
                        filtered.append(c)
            courts = filtered
            total = len(filtered)

        return courts, total

    async def count_active(self) -> int:
        from sqlalchemy import func as sa_func

        result = await self.db.execute(
            select(sa_func.count(Court.id)).where(Court.is_active == True)
        )
        return result.scalar_one()

    async def get_by_id(self, court_id: int) -> Court | None:
        result = await self.db.execute(select(Court).where(Court.id == court_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Court:
        court = Court(**data)
        self.db.add(court)
        await self.db.commit()
        await self.db.refresh(court)
        return court

    async def update(self, court: Court, data: dict) -> Court:
        for key, value in data.items():
            if value is not None:
                setattr(court, key, value)
        await self.db.commit()
        await self.db.refresh(court)
        return court

    async def delete(self, court: Court) -> None:
        await self.db.delete(court)
        await self.db.commit()
