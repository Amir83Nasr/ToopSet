from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class BankCardStatus(str, enum.Enum):
    PENDING_CONFIRMATION = "pending_confirmation"
    VERIFIED = "verified"
    REJECTED = "rejected"


class BankCard(Base):
    __tablename__ = "bank_cards"
    __table_args__ = (UniqueConstraint("user_id", name="uq_bank_cards_user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    encrypted_card_number: Mapped[str] = mapped_column(String(512))
    masked_card_number: Mapped[str] = mapped_column(String(32))
    card_fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    holder_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[BankCardStatus] = mapped_column(
        Enum(BankCardStatus, values_callable=_values_callable),
        default=BankCardStatus.PENDING_CONFIRMATION,
        server_default="pending_confirmation",
        index=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="bank_cards")
