from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EitaaDigestMessage(Base):
    """A posted Eitaa channel digest, kept so it can be edited as slots change."""

    __tablename__ = "eitaa_digest_messages"
    __table_args__ = (
        UniqueConstraint("vendor_id", "digest_date", name="uq_eitaa_digest_vendor_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    # The Iran-local day the digest was posted for (message covers digest_date + the next day).
    digest_date: Mapped[date] = mapped_column(Date, index=True)
    chat_id: Mapped[str] = mapped_column(Text)
    message_id: Mapped[int] = mapped_column(BigInteger)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
