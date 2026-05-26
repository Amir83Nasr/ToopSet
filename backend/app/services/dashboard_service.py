from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.court import Court
from app.models.time_slot import TimeSlot
from app.models.user import User


class DashboardStats(BaseModel):
    active_courts: int
    today_bookings: int
    today_revenue: float
    total_users: int
    recent_bookings: list[dict]  # last 5 bookings with court name, user name, amount, status, time
    popular_courts: list[dict]  # top 5 courts by booking count
    model_config = {"from_attributes": True}


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_stats(self) -> DashboardStats:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # 1. Active courts count
        active_courts_result = await self.db.execute(
            select(func.count(Court.id)).where(Court.is_active.is_(True))
        )
        active_courts = active_courts_result.scalar() or 0

        # 2. Today's bookings (excluding cancelled)
        today_bookings_result = await self.db.execute(
            select(func.count(Booking.id)).where(
                Booking.created_at >= today_start,
                Booking.status.not_in([BookingStatus.CANCELLED]),
            )
        )
        today_bookings = today_bookings_result.scalar() or 0

        # 3. Today's revenue (only confirmed bookings)
        today_revenue_result = await self.db.execute(
            select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
                Booking.created_at >= today_start,
                Booking.status == BookingStatus.CONFIRMED,
            )
        )
        today_revenue = float(today_revenue_result.scalar() or 0)

        # 4. Total users count
        total_users_result = await self.db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar() or 0

        # 5. Recent 5 bookings with joins
        recent_bookings_result = await self.db.execute(
            select(
                Booking.id,
                Court.name.label("court_name"),
                User.full_name.label("user_name"),
                Booking.price_paid,
                Booking.status,
                TimeSlot.start_time,
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Court, TimeSlot.court_id == Court.id)
            .join(User, Booking.user_id == User.id)
            .order_by(Booking.created_at.desc())
            .limit(5)
        )
        recent_bookings = [
            {
                "id": row.id,
                "court_name": row.court_name,
                "user_name": row.user_name,
                "price_paid": float(row.price_paid),
                "status": row.status.value if hasattr(row.status, "value") else row.status,
                "start_time": row.start_time.isoformat() if row.start_time else None,
            }
            for row in recent_bookings_result
        ]

        # 6. Top 5 courts by booking count
        popular_courts_result = await self.db.execute(
            select(
                Court.id.label("court_id"),
                Court.name.label("court_name"),
                func.count(Booking.id).label("booking_count"),
            )
            .join(TimeSlot, Court.id == TimeSlot.court_id)
            .join(Booking, TimeSlot.id == Booking.slot_id)
            .group_by(Court.id, Court.name)
            .order_by(func.count(Booking.id).desc())
            .limit(5)
        )
        popular_courts = [
            {
                "court_id": row.court_id,
                "court_name": row.court_name,
                "booking_count": row.booking_count,
            }
            for row in popular_courts_result
        ]

        return DashboardStats(
            active_courts=active_courts,
            today_bookings=today_bookings,
            today_revenue=today_revenue,
            total_users=total_users,
            recent_bookings=recent_bookings,
            popular_courts=popular_courts,
        )
