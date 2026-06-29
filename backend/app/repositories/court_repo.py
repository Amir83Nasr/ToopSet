from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        sport_types: list[SportType] | None = None,
        is_active: bool | None = True,
        search: str | None = None,
        manager_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        ref_lat: float | None = None,
        ref_lon: float | None = None,
        max_distance_km: float | None = None,
        sort: str = "default",
    ) -> tuple[list[Court], int]:
        query = select(Court).options(
            selectinload(Court.court_images),
            selectinload(Court.manager),
        )

        if sport_types:
            cond = or_(Court.sport_types.any(st.value) for st in sport_types)
            query = query.where(cond)
        if is_active is not None:
            query = query.where(Court.is_active == is_active)
        if manager_id is not None:
            query = query.where(Court.manager_id == manager_id)
        if search:
            pattern = f"%{search}%"
            query = query.where(Court.name.ilike(pattern))

        if after_id is not None:
            query = query.where(Court.id > after_id)

        # Date/price filters: join with time_slots to find courts with available slots
        if date_from or date_to or price_min is not None or price_max is not None:
            query = query.join(Court.time_slots).where(TimeSlot.is_reserved == False)

            if date_from:
                query = query.where(TimeSlot.start_time >= date_from)
            if date_to:
                query = query.where(TimeSlot.end_time <= date_to)
            if price_min is not None:
                query = query.where(TimeSlot.base_price >= price_min)
            if price_max is not None:
                query = query.where(TimeSlot.base_price <= price_max)

            query = query.distinct()

        count_q = select(func.count()).select_from(Court)
        if sport_types:
            count_cond = or_(Court.sport_types.any(st.value) for st in sport_types)
            count_q = count_q.where(count_cond)
        if is_active is not None:
            count_q = count_q.where(Court.is_active == is_active)
        if manager_id is not None:
            count_q = count_q.where(Court.manager_id == manager_id)
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

        if after_id is not None:
            result = await self.db.execute(query.limit(limit).order_by(order))
        else:
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
        result = await self.db.execute(select(func.count(Court.id)).where(Court.is_active == True))
        return result.scalar_one()

    async def get_by_id(self, court_id: int) -> Court | None:
        result = await self.db.execute(
            select(Court)
            .options(
                selectinload(Court.court_images),
                selectinload(Court.manager),
            )
            .where(Court.id == court_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_images(self, court_id: int) -> Court | None:
        result = await self.db.execute(
            select(Court)
            .options(
                selectinload(Court.court_images),
                selectinload(Court.manager),
            )
            .where(Court.id == court_id)
        )
        return result.scalar_one_or_none()

    async def count_by_manager(self, manager_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Court.id)).where(Court.manager_id == manager_id)
        )
        return result.scalar_one()

    async def create(self, data: dict) -> Court:
        court = Court(**data)
        self.db.add(court)
        await self.db.flush()
        await self.db.refresh(court)
        return court

    async def update(self, court: Court, data: dict) -> Court:
        for key, value in data.items():
            if value is not None:
                setattr(court, key, value)
        await self.db.flush()
        await self.db.refresh(court)
        return court

    async def delete(self, court: Court) -> None:
        await self.db.delete(court)
        await self.db.flush()

    async def get_min_prices(self, court_ids: list[int]) -> dict[int, Decimal | None]:
        """Return {court_id: min_base_price} for un-reserved time slots."""
        if not court_ids:
            return {}

        result = await self.db.execute(
            select(TimeSlot.court_id, func.min(TimeSlot.base_price))
            .where(
                TimeSlot.court_id.in_(court_ids),
                TimeSlot.is_reserved == False,
            )
            .group_by(TimeSlot.court_id)
        )
        return {row[0]: row[1] for row in result.all()}
