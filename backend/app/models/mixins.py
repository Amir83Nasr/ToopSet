from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class SoftDeleteMixin:
    """Add ``is_deleted`` and ``deleted_at`` columns for soft deletion.

    Usage::

        class MyModel(Base, SoftDeleteMixin):
            __tablename__ = "my_models"
            ...
    """

    is_deleted: Mapped[bool] = mapped_column(
        default=False,
        server_default="false",
        index=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True
    )

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)  # noqa: FIX002
