from datetime import datetime

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    email: Mapped[str] = mapped_column(String(256))
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    subject: Mapped[str] = mapped_column(String(512))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
