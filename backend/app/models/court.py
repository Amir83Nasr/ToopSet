from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import ARRAY, JSON, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class SportType(str, enum.Enum):
    VOLLEYBALL = "volleyball"
    BASKETBALL = "basketball"
    FUTSAL = "futsal"
    HANDBALL = "handball"
    FOOTBALL = "football"


class Court(Base):
    __tablename__ = "courts"

    id: Mapped[int] = mapped_column(primary_key=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(256))
    sport_types: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, server_default="{}")
    address: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    capacity: Mapped[int] = mapped_column(Integer)
    images: Mapped[list[str] | None] = mapped_column(ARRAY(String(512)), default=None)
    amenities: Mapped[dict | None] = mapped_column(type_=JSON, default=None)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    average_rating: Mapped[float] = mapped_column(Float, default=0.0, server_default="0.0")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    manager: Mapped["User"] = relationship(back_populates="courts")
    time_slots: Mapped[list["TimeSlot"]] = relationship(
        back_populates="court", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="court", cascade="all, delete-orphan"
    )
    court_images: Mapped[list["CourtImage"]] = relationship(
        back_populates="court", cascade="all, delete-orphan", order_by="CourtImage.order"
    )
