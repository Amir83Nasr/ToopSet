from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VendorChannel(Base):
    """A channel address that receives a vendor's daily Eitaa slot digest."""

    __tablename__ = "vendor_channels"
    __table_args__ = (
        UniqueConstraint("vendor_id", "chat_id", name="uq_vendor_channels_vendor_chat"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    chat_id: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    vendor: Mapped["Vendor"] = relationship(back_populates="channels")  # noqa: F821
