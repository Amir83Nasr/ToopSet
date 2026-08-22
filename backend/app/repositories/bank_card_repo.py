from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bank_card import BankCard, BankCardStatus


class BankCardRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, card_id: int) -> BankCard | None:
        return await self.db.get(BankCard, card_id)

    async def get_by_fingerprint(self, user_id: int, fingerprint: str) -> BankCard | None:
        result = await self.db.execute(
            select(BankCard).where(
                BankCard.user_id == user_id,
                BankCard.card_fingerprint == fingerprint,
            )
        )
        return result.scalar_one_or_none()

    async def get_for_user(self, user_id: int) -> BankCard | None:
        result = await self.db.execute(select(BankCard).where(BankCard.user_id == user_id).limit(1))
        return result.scalar_one_or_none()

    async def get_verified_for_user(self, user_id: int) -> BankCard | None:
        result = await self.db.execute(
            select(BankCard)
            .where(BankCard.user_id == user_id, BankCard.status == BankCardStatus.VERIFIED)
            .order_by(BankCard.verified_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def upsert_pending(
        self,
        *,
        user_id: int,
        encrypted_card_number: str,
        masked_card_number: str,
        card_fingerprint: str,
        holder_name: str | None,
    ) -> BankCard:
        card = await self.get_for_user(user_id)
        if card is None:
            card = BankCard(
                user_id=user_id,
                encrypted_card_number=encrypted_card_number,
                masked_card_number=masked_card_number,
                card_fingerprint=card_fingerprint,
                holder_name=holder_name,
                status=BankCardStatus.PENDING_CONFIRMATION,
            )
            self.db.add(card)
        else:
            card.encrypted_card_number = encrypted_card_number
            card.masked_card_number = masked_card_number
            card.holder_name = holder_name
            card.status = BankCardStatus.PENDING_CONFIRMATION
            card.verified_at = None
        await self.db.flush()
        await self.db.refresh(card)
        return card
