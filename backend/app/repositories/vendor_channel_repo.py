from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vendor import Vendor
from app.models.vendor_channel import VendorChannel


class VendorChannelRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_vendor(self, vendor_id: int) -> list[VendorChannel]:
        result = await self.db.execute(
            select(VendorChannel)
            .where(VendorChannel.vendor_id == vendor_id)
            .order_by(VendorChannel.id)
        )
        return list(result.scalars().all())

    async def list_all_active(self) -> list[VendorChannel]:
        result = await self.db.execute(
            select(VendorChannel).where(VendorChannel.is_active == True)  # noqa: E712
        )
        return list(result.scalars().all())

    async def replace_vendor_channels(
        self, vendor: Vendor, channels: list[dict[str, object]]
    ) -> list[VendorChannel]:
        """Replace the vendor's channel rows with the given ``{chat_id, is_active}`` list.

        Rows whose chat_id already exists keep their identity (so posted digest
        messages stay linked to the channel); brand-new ids are inserted.
        """
        existing = {row.chat_id: row for row in await self.list_by_vendor(vendor.id)}
        kept: set[int] = set()
        for item in channels:
            chat_id = str(item["chat_id"]).strip()
            row = existing.get(chat_id)
            if row is None:
                row = VendorChannel(vendor_id=vendor.id, chat_id=chat_id)
                self.db.add(row)
            row.is_active = bool(item.get("is_active", True))
            kept.add(chat_id)
        for chat_id, row in existing.items():
            if chat_id not in kept:
                await self.db.execute(delete(VendorChannel).where(VendorChannel.id == row.id))
        await self.db.flush()
        return await self.list_by_vendor(vendor.id)
