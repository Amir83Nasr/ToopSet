from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eitaa_digest import EitaaDigestMessage


class EitaaDigestRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_vendor_and_date(
        self, vendor_id: int, digest_date: date
    ) -> EitaaDigestMessage | None:
        result = await self.db.execute(
            select(EitaaDigestMessage).where(
                EitaaDigestMessage.vendor_id == vendor_id,
                EitaaDigestMessage.digest_date == digest_date,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_date(self, digest_date: date) -> list[EitaaDigestMessage]:
        """All digest messages posted for the given Iran-local day."""
        result = await self.db.execute(
            select(EitaaDigestMessage)
            .where(EitaaDigestMessage.digest_date == digest_date)
            .order_by(EitaaDigestMessage.vendor_id)
        )
        return list(result.scalars().all())

    async def upsert(
        self,
        *,
        vendor_id: int,
        digest_date: date,
        chat_id: str,
        message_id: int,
        text: str,
    ) -> EitaaDigestMessage:
        """Record (or supersede) the message posted for a vendor on a digest day."""
        row = await self.get_by_vendor_and_date(vendor_id, digest_date)
        if row is None:
            row = EitaaDigestMessage(
                vendor_id=vendor_id,
                digest_date=digest_date,
                chat_id=chat_id,
                message_id=message_id,
                text=text,
            )
            self.db.add(row)
        else:
            row.chat_id = chat_id
            row.message_id = message_id
            row.text = text
        await self.db.flush()
        return row

    async def set_text(self, row: EitaaDigestMessage, text: str) -> None:
        row.text = text
        await self.db.flush()
