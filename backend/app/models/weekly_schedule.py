from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.time_slot import SlotGender

_values_callable = lambda enum_class: [item.value for item in enum_class]  # noqa: E731


class WeeklyScheduleVersion(Base):
    """An immutable weekly template saved when a schedule is applied."""

    __tablename__ = "weekly_schedule_versions"
    __table_args__ = (Index("ix_weekly_schedule_versions_vendor_id_id", "vendor_id", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(
        ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_until: Mapped[date] = mapped_column(Date, nullable=False)
    duration_months: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    items: Mapped[list["WeeklyScheduleVersionItem"]] = relationship(
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="WeeklyScheduleVersionItem.day_of_week, WeeklyScheduleVersionItem.start_time",
    )


class WeeklyScheduleVersionItem(Base):
    __tablename__ = "weekly_schedule_version_items"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_weekly_item_day"),
        CheckConstraint("start_time < end_time", name="ck_weekly_item_time_order"),
        UniqueConstraint(
            "version_id",
            "day_of_week",
            "start_time",
            "end_time",
            name="uq_weekly_item_version_day_time",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(
        ForeignKey("weekly_schedule_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    gender: Mapped[SlotGender] = mapped_column(
        Enum(SlotGender, values_callable=_values_callable, name="slotgender"),
        nullable=False,
        default=SlotGender.MALE,
        server_default="male",
    )

    version: Mapped[WeeklyScheduleVersion] = relationship(back_populates="items")
