from __future__ import annotations

import asyncio
from collections import Counter
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.wallet import Wallet


def _utcnow() -> datetime:
    """Return a naive UTC datetime suitable for DB queries.

    All datetimes stored in the DB are naive UTC (TIMESTAMP WITHOUT TIME ZONE).
    Converting to naive UTC before querying avoids asyncpg type mismatches.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DashboardStats(BaseModel):
    active_vendors: int
    today_bookings: int
    today_revenue: float
    total_users: int
    recent_bookings: list[dict]  # last 5 bookings with vendor name, user name, amount, status, time
    popular_vendors: list[dict]  # top 5 vendors by booking count
    model_config = {"from_attributes": True}


class AdminStats(BaseModel):
    total_vendors: int
    total_users: int
    total_bookings: int
    total_revenue: float
    active_managers: int
    pending_bookings: int
    today_bookings: int = 0
    today_revenue: float = 0
    total_managers: int = 0
    recent_bookings: list[dict] = []
    popular_vendors: list[dict] = []
    user_growth: list[dict] = []
    booking_trends: list[dict] = []


class ManagerStats(BaseModel):
    my_vendors: int
    upcoming_bookings: int
    today_earnings: float
    wallet_balance: float
    recent_bookings: list[dict]


class UserStats(BaseModel):
    upcoming_bookings: int
    completed_bookings: int
    wallet_balance: float
    favorite_sport: str
    recent_bookings: list[dict]


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_revenue_report(
        self, user_id: int, date_from: datetime | None = None, date_to: datetime | None = None
    ) -> list[dict]:
        query = (
            select(
                func.date(TimeSlot.start_time).label("date"),
                func.count(Booking.id).label("bookings_count"),
                func.coalesce(func.sum(Booking.price_paid), 0).label("revenue"),
                func.coalesce(func.sum(Booking.penalty_amount), 0).label("penalties"),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Vendor.manager_id == user_id)
            .where(Booking.status == BookingStatus.CONFIRMED)
        )

        if date_from:
            query = query.where(Booking.created_at >= date_from)
        if date_to:
            query = query.where(Booking.created_at <= date_to)

        query = query.group_by(func.date(TimeSlot.start_time)).order_by(
            func.date(TimeSlot.start_time).desc()
        )

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "date": str(row.date),
                "bookings_count": row.bookings_count,
                "revenue": float(row.revenue),
                "penalties": float(row.penalties),
            }
            for row in rows
        ]

    async def get_stats(self) -> DashboardStats:
        today_start = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        async def _active_vendors() -> int:
            r = await self.db.execute(
                select(func.count(Vendor.id)).where(Vendor.is_active.is_(True))
            )
            return r.scalar() or 0

        async def _today_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id)).where(
                    Booking.created_at >= today_start,
                    Booking.status.not_in([BookingStatus.CANCELLED]),
                )
            )
            return r.scalar() or 0

        async def _today_revenue() -> float:
            r = await self.db.execute(
                select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
                    Booking.created_at >= today_start,
                    Booking.status == BookingStatus.CONFIRMED,
                )
            )
            return float(r.scalar() or 0)

        async def _total_users() -> int:
            r = await self.db.execute(select(func.count(User.id)))
            return r.scalar() or 0

        async def _recent_bookings() -> list[dict]:
            r = await self.db.execute(
                select(
                    Booking.id,
                    Vendor.name.label("vendor_name"),
                    User.full_name.label("user_name"),
                    Booking.price_paid,
                    Booking.status,
                    TimeSlot.start_time,
                )
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .join(User, Booking.user_id == User.id)
                .order_by(Booking.created_at.desc())
                .limit(5)
            )
            return [
                {
                    "id": row.id,
                    "vendor_name": row.vendor_name,
                    "user_name": row.user_name,
                    "price_paid": float(row.price_paid),
                    "status": row.status.value if hasattr(row.status, "value") else row.status,
                    "start_time": row.start_time.isoformat() if row.start_time else None,
                }
                for row in r
            ]

        async def _popular_vendors() -> list[dict]:
            r = await self.db.execute(
                select(
                    Vendor.id.label("vendor_id"),
                    Vendor.name.label("vendor_name"),
                    func.count(Booking.id).label("booking_count"),
                )
                .join(TimeSlot, Vendor.id == TimeSlot.vendor_id)
                .join(Booking, TimeSlot.id == Booking.slot_id)
                .group_by(Vendor.id, Vendor.name)
                .order_by(func.count(Booking.id).desc())
                .limit(5)
            )
            return [
                {
                    "vendor_id": row.vendor_id,
                    "vendor_name": row.vendor_name,
                    "booking_count": row.booking_count,
                }
                for row in r
            ]

        (
            active_vendors,
            today_bookings,
            today_revenue,
            total_users,
            recent_bookings,
            popular_vendors,
        ) = await asyncio.gather(
            _active_vendors(),
            _today_bookings(),
            _today_revenue(),
            _total_users(),
            _recent_bookings(),
            _popular_vendors(),
        )

        return DashboardStats(
            active_vendors=active_vendors,
            today_bookings=today_bookings,
            today_revenue=today_revenue,
            total_users=total_users,
            recent_bookings=recent_bookings,
            popular_vendors=popular_vendors,
        )

    async def get_admin_stats(
        self, date_from: datetime | None = None, date_to: datetime | None = None
    ) -> AdminStats:
        now = _utcnow()

        start_date = date_from or now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = date_to or now
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = now - timedelta(days=7)

        async def _total_vendors() -> int:
            r = await self.db.execute(select(func.count(Vendor.id)))
            return r.scalar() or 0

        async def _total_users() -> int:
            r = await self.db.execute(select(func.count(User.id)))
            return r.scalar() or 0

        async def _total_bookings() -> int:
            q = select(func.count(Booking.id))
            if date_from:
                q = q.where(Booking.created_at >= start_date)
            if date_to:
                q = q.where(Booking.created_at <= end_date)
            r = await self.db.execute(q)
            return r.scalar() or 0

        async def _total_revenue() -> float:
            q = select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
                Booking.status == BookingStatus.CONFIRMED
            )
            if date_from:
                q = q.where(Booking.created_at >= start_date)
            if date_to:
                q = q.where(Booking.created_at <= end_date)
            r = await self.db.execute(q)
            return float(r.scalar() or 0)

        async def _active_managers() -> int:
            r = await self.db.execute(
                select(func.count(User.id)).where(
                    User.role == UserRole.MANAGER, User.is_active.is_(True)
                )
            )
            return r.scalar() or 0

        async def _pending_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id)).where(
                    Booking.status == BookingStatus.PENDING_PAYMENT
                )
            )
            return r.scalar() or 0

        async def _today_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id)).where(
                    Booking.created_at >= today_start,
                    Booking.status.not_in([BookingStatus.CANCELLED]),
                )
            )
            return r.scalar() or 0

        async def _today_revenue() -> float:
            r = await self.db.execute(
                select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
                    Booking.created_at >= today_start,
                    Booking.status == BookingStatus.CONFIRMED,
                )
            )
            return float(r.scalar() or 0)

        async def _total_managers() -> int:
            r = await self.db.execute(
                select(func.count(User.id)).where(User.role == UserRole.MANAGER)
            )
            return r.scalar() or 0

        async def _recent_bookings() -> list[dict]:
            r = await self.db.execute(
                select(
                    Booking.id,
                    Vendor.name.label("vendor_name"),
                    User.full_name.label("user_name"),
                    Booking.price_paid,
                    Booking.status,
                    TimeSlot.start_time,
                )
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .join(User, Booking.user_id == User.id)
                .order_by(Booking.created_at.desc())
                .limit(10)
            )
            return [
                {
                    "id": row.id,
                    "vendor_name": row.vendor_name,
                    "user_name": row.user_name,
                    "price_paid": float(row.price_paid),
                    "status": row.status.value if hasattr(row.status, "value") else row.status,
                    "start_time": row.start_time.isoformat() if row.start_time else None,
                }
                for row in r
            ]

        async def _popular_vendors() -> list[dict]:
            r = await self.db.execute(
                select(
                    Vendor.id.label("vendor_id"),
                    Vendor.name.label("vendor_name"),
                    func.count(Booking.id).label("booking_count"),
                )
                .join(TimeSlot, Vendor.id == TimeSlot.vendor_id)
                .join(Booking, TimeSlot.id == Booking.slot_id)
                .group_by(Vendor.id, Vendor.name)
                .order_by(func.count(Booking.id).desc())
                .limit(5)
            )
            return [
                {
                    "vendor_id": row.vendor_id,
                    "vendor_name": row.vendor_name,
                    "booking_count": row.booking_count,
                }
                for row in r
            ]

        async def _booking_trends() -> list[dict]:
            r = await self.db.execute(
                select(
                    func.date(Booking.created_at).label("date"),
                    func.count(Booking.id).label("count"),
                )
                .where(Booking.created_at >= seven_days_ago)
                .group_by(func.date(Booking.created_at))
                .order_by(func.date(Booking.created_at).asc())
            )
            return [{"date": str(row.date), "count": row.count} for row in r]

        (
            total_vendors,
            total_users,
            total_bookings,
            total_revenue,
            active_managers,
            pending_bookings,
            today_bookings,
            today_revenue,
            total_managers,
            recent_bookings,
            popular_vendors,
            booking_trends,
        ) = await asyncio.gather(
            _total_vendors(),
            _total_users(),
            _total_bookings(),
            _total_revenue(),
            _active_managers(),
            _pending_bookings(),
            _today_bookings(),
            _today_revenue(),
            _total_managers(),
            _recent_bookings(),
            _popular_vendors(),
            _booking_trends(),
        )

        return AdminStats(
            total_vendors=total_vendors,
            total_users=total_users,
            total_bookings=total_bookings,
            total_revenue=total_revenue,
            active_managers=active_managers,
            pending_bookings=pending_bookings,
            today_bookings=today_bookings,
            today_revenue=today_revenue,
            total_managers=total_managers,
            recent_bookings=recent_bookings,
            popular_vendors=popular_vendors,
            booking_trends=booking_trends,
        )

    async def get_manager_stats(self, user_id: int) -> ManagerStats:
        now = _utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        async def _my_vendors() -> int:
            r = await self.db.execute(
                select(func.count(Vendor.id)).where(Vendor.manager_id == user_id)
            )
            return r.scalar() or 0

        async def _upcoming_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id))
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .where(Vendor.manager_id == user_id)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .where(TimeSlot.start_time > now)
            )
            return r.scalar() or 0

        async def _today_earnings() -> float:
            r = await self.db.execute(
                select(func.coalesce(func.sum(Booking.price_paid), 0))
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .where(Vendor.manager_id == user_id)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .where(TimeSlot.start_time >= today_start)
            )
            return float(r.scalar() or 0)

        async def _wallet_balance() -> float:
            r = await self.db.execute(select(Wallet.balance).where(Wallet.user_id == user_id))
            row = r.scalar_one_or_none()
            return float(row) if row is not None else 0

        async def _recent_bookings() -> list[dict]:
            r = await self.db.execute(
                select(
                    Booking.id,
                    Vendor.name.label("vendor_name"),
                    TimeSlot.start_time,
                    Booking.price_paid,
                )
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .where(Vendor.manager_id == user_id)
                .order_by(Booking.created_at.desc())
                .limit(5)
            )
            return [
                {
                    "id": row.id,
                    "vendor_name": row.vendor_name,
                    "start_time": row.start_time.isoformat() if row.start_time else None,
                    "price_paid": float(row.price_paid),
                }
                for row in r
            ]

        (
            my_vendors,
            upcoming_bookings,
            today_earnings,
            wallet_balance,
            recent_bookings,
        ) = await asyncio.gather(
            _my_vendors(),
            _upcoming_bookings(),
            _today_earnings(),
            _wallet_balance(),
            _recent_bookings(),
        )

        return ManagerStats(
            my_vendors=my_vendors,
            upcoming_bookings=upcoming_bookings,
            today_earnings=today_earnings,
            wallet_balance=wallet_balance,
            recent_bookings=recent_bookings,
        )

    async def get_monthly_recap(self) -> dict:
        now = _utcnow()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if current_month_start.month == 1:
            last_month_start = current_month_start.replace(
                year=current_month_start.year - 1, month=12
            )
        else:
            last_month_start = current_month_start.replace(month=current_month_start.month - 1)
        last_month_end = current_month_start

        async def _month_bookings(start: datetime, end: datetime) -> int:
            r = await self.db.execute(
                select(func.count(Booking.id)).where(
                    Booking.created_at >= start,
                    Booking.created_at < end,
                    Booking.status.not_in([BookingStatus.CANCELLED]),
                )
            )
            return r.scalar() or 0

        async def _month_revenue(start: datetime, end: datetime) -> float:
            r = await self.db.execute(
                select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
                    Booking.created_at >= start,
                    Booking.created_at < end,
                    Booking.status == BookingStatus.CONFIRMED,
                )
            )
            return float(r.scalar() or 0)

        async def _month_users(start: datetime, end: datetime) -> int:
            r = await self.db.execute(
                select(func.count(User.id)).where(
                    User.created_at >= start,
                    User.created_at < end,
                )
            )
            return r.scalar() or 0

        # All 6 queries (3 per month × 2 months) are independent
        c_b, c_r, c_u, l_b, l_r, l_u = await asyncio.gather(
            _month_bookings(current_month_start, now),
            _month_revenue(current_month_start, now),
            _month_users(current_month_start, now),
            _month_bookings(last_month_start, last_month_end),
            _month_revenue(last_month_start, last_month_end),
            _month_users(last_month_start, last_month_end),
        )

        current = {"bookings": c_b, "revenue": c_r, "new_users": c_u}
        last = {"bookings": l_b, "revenue": l_r, "new_users": l_u}

        def pct_change(current_val: float, last_val: float) -> float:
            if last_val == 0:
                return 100.0 if current_val > 0 else 0.0
            return round((current_val - last_val) / last_val * 100, 1)

        return {
            "current_month": {
                "label": current_month_start.strftime("%B"),
                "bookings": current["bookings"],
                "revenue": current["revenue"],
                "new_users": current["new_users"],
            },
            "last_month": {
                "label": last_month_start.strftime("%B"),
                "bookings": last["bookings"],
                "revenue": last["revenue"],
                "new_users": last["new_users"],
            },
            "changes": {
                "bookings_pct": pct_change(current["bookings"], last["bookings"]),
                "revenue_pct": pct_change(current["revenue"], last["revenue"]),
                "users_pct": pct_change(current["new_users"], last["new_users"]),
            },
        }

    async def get_admin_charts(self) -> dict:
        now = _utcnow()
        thirty_days_ago = now - timedelta(days=30)

        async def _user_growth() -> list[dict]:
            r = await self.db.execute(
                select(
                    func.date(User.created_at).label("date"),
                    func.count(User.id).label("count"),
                )
                .where(User.created_at >= thirty_days_ago)
                .group_by(func.date(User.created_at))
                .order_by(func.date(User.created_at).asc())
            )
            return [{"date": str(row.date), "count": row.count} for row in r]

        async def _vendor_growth() -> list[dict]:
            r = await self.db.execute(
                select(
                    func.date(Vendor.created_at).label("date"),
                    func.count(Vendor.id).label("count"),
                )
                .where(Vendor.created_at >= thirty_days_ago)
                .group_by(func.date(Vendor.created_at))
                .order_by(func.date(Vendor.created_at).asc())
            )
            return [{"date": str(row.date), "count": row.count} for row in r]

        async def _booking_trends() -> list[dict]:
            r = await self.db.execute(
                select(
                    func.date(Booking.created_at).label("date"),
                    func.count(Booking.id).label("count"),
                )
                .where(Booking.created_at >= thirty_days_ago)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .group_by(func.date(Booking.created_at))
                .order_by(func.date(Booking.created_at).asc())
            )
            return [{"date": str(row.date), "count": row.count} for row in r]

        async def _revenue_trends() -> list[dict]:
            r = await self.db.execute(
                select(
                    func.date(Booking.created_at).label("date"),
                    func.coalesce(func.sum(Booking.price_paid), 0).label("revenue"),
                    func.coalesce(func.sum(Booking.penalty_amount), 0).label("penalties"),
                )
                .where(Booking.created_at >= thirty_days_ago)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .group_by(func.date(Booking.created_at))
                .order_by(func.date(Booking.created_at).asc())
            )
            return [
                {
                    "date": str(row.date),
                    "revenue": float(row.revenue),
                    "penalties": float(row.penalties),
                }
                for row in r
            ]

        user_growth, vendor_growth, booking_trends, revenue_trends = await asyncio.gather(
            _user_growth(),
            _vendor_growth(),
            _booking_trends(),
            _revenue_trends(),
        )

        return {
            "user_growth": user_growth,
            "vendor_growth": vendor_growth,
            "booking_trends": booking_trends,
            "revenue_trends": revenue_trends,
        }

    async def get_user_stats(self, user_id: int) -> UserStats:
        now = _utcnow()

        async def _upcoming_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id))
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .where(Booking.user_id == user_id)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .where(TimeSlot.start_time > now)
            )
            return r.scalar() or 0

        async def _completed_bookings() -> int:
            r = await self.db.execute(
                select(func.count(Booking.id))
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .where(Booking.user_id == user_id)
                .where(Booking.status == BookingStatus.CONFIRMED)
                .where(TimeSlot.start_time <= now)
            )
            return r.scalar() or 0

        async def _wallet_balance() -> float:
            r = await self.db.execute(select(Wallet.balance).where(Wallet.user_id == user_id))
            row = r.scalar_one_or_none()
            return float(row) if row is not None else 0

        async def _favorite_sport() -> str:
            r = await self.db.execute(
                select(Vendor.sport_types)
                .join(TimeSlot, Vendor.id == TimeSlot.vendor_id)
                .join(Booking, TimeSlot.id == Booking.slot_id)
                .where(Booking.user_id == user_id)
                .limit(50)
            )
            counter: Counter[str] = Counter()
            for row in r.all():
                for st in row.sport_types or []:
                    counter[st] += 1
            return counter.most_common(1)[0][0] if counter else ""

        async def _recent_bookings() -> list[dict]:
            r = await self.db.execute(
                select(
                    Booking.id,
                    Vendor.name.label("vendor_name"),
                    TimeSlot.start_time,
                    Booking.status,
                    Booking.price_paid,
                )
                .join(TimeSlot, Booking.slot_id == TimeSlot.id)
                .join(Vendor, TimeSlot.vendor_id == Vendor.id)
                .where(Booking.user_id == user_id)
                .order_by(Booking.created_at.desc())
                .limit(5)
            )
            return [
                {
                    "id": row.id,
                    "vendor_name": row.vendor_name,
                    "start_time": row.start_time.isoformat() if row.start_time else None,
                    "status": row.status.value if hasattr(row.status, "value") else row.status,
                    "price_paid": float(row.price_paid),
                }
                for row in r
            ]

        (
            upcoming_bookings,
            completed_bookings,
            wallet_balance,
            favorite_sport,
            recent_bookings,
        ) = await asyncio.gather(
            _upcoming_bookings(),
            _completed_bookings(),
            _wallet_balance(),
            _favorite_sport(),
            _recent_bookings(),
        )

        return UserStats(
            upcoming_bookings=upcoming_bookings,
            completed_bookings=completed_bookings,
            wallet_balance=wallet_balance,
            favorite_sport=favorite_sport,
            recent_bookings=recent_bookings,
        )
