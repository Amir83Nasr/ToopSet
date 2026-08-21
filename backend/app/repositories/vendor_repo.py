from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import func, null, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.time_slot import SlotStatus, TimeSlot
from app.models.user import User
from app.models.vendor import SportType, Vendor
from app.models.vendor_image import VendorImage
from app.services.cache_service import get_cached_vendor_min_prices


class VendorRepo:
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
    ) -> tuple[list[Mapping[str, object]], int]:
        main_image_subq = (
            select(VendorImage.url)
            .where(VendorImage.vendor_id == Vendor.id)
            .order_by(VendorImage.order, VendorImage.id)
            .limit(1)
            .correlate(Vendor)
            .scalar_subquery()
        )
        # Only evaluate min_price subquery in DB if explicitly sorting by price
        if sort in ("price_asc", "price_desc"):
            min_price_col = (
                select(func.min(TimeSlot.base_price))
                .where(
                    TimeSlot.vendor_id == Vendor.id,
                    TimeSlot.is_reserved == False,
                    TimeSlot.status == SlotStatus.OPEN,
                )
                .correlate(Vendor)
                .scalar_subquery()
            )
        else:
            min_price_col = null()

        query = select(
            Vendor.id.label("id"),
            Vendor.name.label("name"),
            Vendor.sport_types.label("sport_types"),
            Vendor.address.label("address"),
            Vendor.latitude.label("latitude"),
            Vendor.longitude.label("longitude"),
            Vendor.capacity.label("capacity"),
            Vendor.is_active.label("is_active"),
            Vendor.average_rating.label("average_rating"),
            Vendor.created_at.label("created_at"),
            User.full_name.label("manager_name"),
            main_image_subq.label("main_image"),
            min_price_col.label("base_price"),
        ).outerjoin(User, User.id == Vendor.manager_id)

        if sport_types:
            cond = or_(Vendor.sport_types.any(st.value) for st in sport_types)
            query = query.where(cond)
        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)
        if manager_id is not None:
            query = query.where(Vendor.manager_id == manager_id)
        if search:
            pattern = f"%{search}%"
            query = query.where(Vendor.name.ilike(pattern))

        if after_id is not None:
            query = query.where(Vendor.id < after_id)

        available_slot_filter = None
        if date_from or date_to or price_min is not None or price_max is not None:
            slot_conditions = [
                TimeSlot.vendor_id == Vendor.id,
                TimeSlot.is_reserved == False,
                TimeSlot.status == SlotStatus.OPEN,
            ]
            if date_from:
                slot_conditions.append(TimeSlot.start_time >= date_from)
            if date_to:
                slot_conditions.append(TimeSlot.end_time <= date_to)
            if price_min is not None:
                slot_conditions.append(TimeSlot.base_price >= price_min)
            if price_max is not None:
                slot_conditions.append(TimeSlot.base_price <= price_max)
            available_slot_filter = select(TimeSlot.id).where(*slot_conditions).exists()
            query = query.where(available_slot_filter)

        count_q = select(func.count(func.distinct(Vendor.id))).select_from(Vendor)
        if sport_types:
            count_cond = or_(Vendor.sport_types.any(st.value) for st in sport_types)
            count_q = count_q.where(count_cond)
        if is_active is not None:
            count_q = count_q.where(Vendor.is_active == is_active)
        if manager_id is not None:
            count_q = count_q.where(Vendor.manager_id == manager_id)
        if search:
            count_q = count_q.where(Vendor.name.ilike(f"%{search}%"))

        if available_slot_filter is not None:
            count_q = count_q.where(available_slot_filter)

        total = (await self.db.execute(count_q)).scalar_one()

        order = Vendor.id.desc()
        if sort in ("price_asc", "price_desc"):
            order = min_price_col.asc() if sort == "price_asc" else min_price_col.desc()
        elif sort == "rating":
            order = Vendor.average_rating.desc()

        distance_filter = (
            ref_lat is not None and ref_lon is not None and max_distance_km is not None
        )
        if distance_filter:
            result = await self.db.execute(query.order_by(order))
        elif after_id is not None:
            result = await self.db.execute(query.limit(limit).order_by(order))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit).order_by(order))
        raw_vendors = list(result.mappings().all())

        # Distance filter (in-memory Haversine)
        if distance_filter:
            filtered = []
            for vendor in raw_vendors:
                latitude = vendor["latitude"]
                longitude = vendor["longitude"]
                if isinstance(latitude, (int, float)) and isinstance(longitude, (int, float)):
                    d = self._haversine_km(ref_lat, ref_lon, latitude, longitude)
                    if d <= max_distance_km:
                        filtered.append(vendor)
            raw_vendors = filtered
            total = len(filtered)
            raw_vendors = raw_vendors[skip : skip + limit]

        # Convert to mutable dicts and inject weekly min_price from Redis cache
        vendors = [dict(v) for v in raw_vendors]
        if vendors:
            vendor_ids = [int(v["id"]) for v in vendors]
            cached_prices = await get_cached_vendor_min_prices(vendor_ids)
            for v in vendors:
                vid = int(v["id"])
                if vid in cached_prices and cached_prices[vid] is not None:
                    v["base_price"] = cached_prices[vid]

        return vendors, total

    async def count_active(self) -> int:
        result = await self.db.execute(
            select(func.count(Vendor.id)).where(Vendor.is_active == True)
        )
        return result.scalar_one()

    async def get_by_id(self, vendor_id: int) -> Vendor | None:
        result = await self.db.execute(
            select(Vendor)
            .options(
                joinedload(Vendor.vendor_images),
                joinedload(Vendor.manager),
            )
            .where(Vendor.id == vendor_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_by_id_with_images(self, vendor_id: int) -> Vendor | None:
        result = await self.db.execute(
            select(Vendor)
            .options(
                joinedload(Vendor.vendor_images),
                joinedload(Vendor.manager),
            )
            .where(Vendor.id == vendor_id)
        )
        return result.unique().scalar_one_or_none()

    async def count_by_manager(self, manager_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Vendor.id)).where(Vendor.manager_id == manager_id)
        )
        return result.scalar_one()

    async def create(self, data: dict) -> Vendor:
        vendor = Vendor(**data)
        self.db.add(vendor)
        await self.db.flush()
        await self.db.refresh(vendor)
        return vendor

    async def update(self, vendor: Vendor, data: dict) -> Vendor:
        for key, value in data.items():
            setattr(vendor, key, value)
        await self.db.flush()
        await self.db.refresh(vendor)
        return vendor

    async def delete(self, vendor: Vendor) -> None:
        await self.db.delete(vendor)
        await self.db.flush()
