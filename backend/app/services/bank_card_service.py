from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.card_security import (
    card_fingerprint,
    encrypt_card_number,
    mask_card_number,
    normalize_card_number,
)
from app.core.config import settings
from app.core.logger import log_action
from app.core.timezone import now_utc
from app.models.bank_card import BankCard, BankCardStatus
from app.models.user import User
from app.repositories.bank_card_repo import BankCardRepo


class BankCardVerificationError(Exception):
    pass


class BankCardProviderUnavailable(BankCardVerificationError):
    pass


@dataclass(frozen=True)
class BankCardLookupResult:
    holder_name: str


class BankCardVerificationProvider:
    async def lookup_owner(self, card_number: str) -> BankCardLookupResult:
        raise NotImplementedError


class MockBankCardVerificationProvider(BankCardVerificationProvider):
    async def lookup_owner(self, card_number: str) -> BankCardLookupResult:
        normalized = normalize_card_number(card_number)
        if normalized.endswith("0000"):
            raise BankCardProviderUnavailable("bank card provider unavailable")
        return BankCardLookupResult(holder_name="دارنده کارت تست")


class BankCardService:
    def __init__(
        self,
        db: AsyncSession,
        current_user: User,
        provider: BankCardVerificationProvider | None = None,
    ):
        self.db = db
        self.current_user = current_user
        self.repo = BankCardRepo(db)
        if provider is not None:
            self.provider = provider
        elif settings.is_development_or_bootstrap:
            self.provider = MockBankCardVerificationProvider()
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="سرویس واقعی استعلام کارت در این نسخه پیکربندی نشده است",
            )

    async def lookup_card(self, card_number: str) -> BankCard:
        normalized = normalize_card_number(card_number)
        if len(normalized) != 16:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="شماره کارت باید ۱۶ رقم باشد",
            )

        try:
            lookup = await self.provider.lookup_owner(normalized)
        except BankCardProviderUnavailable:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="سرویس استعلام کارت در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
            )
        except BankCardVerificationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="استعلام مالک کارت ناموفق بود",
            )

        card = await self.repo.upsert_pending(
            user_id=self.current_user.id,
            encrypted_card_number=encrypt_card_number(normalized),
            masked_card_number=mask_card_number(normalized),
            card_fingerprint=card_fingerprint(normalized),
            holder_name=lookup.holder_name,
        )
        await log_action(
            self.db,
            self.current_user.id,
            "bank_card_lookup",
            f"استعلام کارت بانکی | card_id={card.id} | {card.masked_card_number}",
        )
        return card

    async def confirm_card(self, card_id: int) -> BankCard:
        card = await self.repo.get_by_id(card_id)
        if card is None or card.user_id != self.current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارت یافت نشد")
        if card.status != BankCardStatus.PENDING_CONFIRMATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این کارت در وضعیت قابل تأیید نیست",
            )
        card.status = BankCardStatus.VERIFIED
        card.verified_at = now_utc()
        # Manager cancellations may create a pending refund before the user has
        # a verified card. Attach this card only to refunds that still have no
        # immutable payout destination snapshot.
        from app.models.refund import Refund, RefundStatus

        refunds = list(
            (
                await self.db.execute(
                    select(Refund).where(
                        Refund.user_id == self.current_user.id,
                        Refund.status.in_((RefundStatus.PENDING, RefundStatus.APPROVED)),
                        Refund.destination_card_encrypted.is_(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        for refund in refunds:
            refund.destination_card_encrypted = card.encrypted_card_number
            refund.destination_card_masked = card.masked_card_number
            refund.destination_card_holder_name = card.holder_name
        await self.db.flush()
        await self.db.refresh(card)
        await log_action(
            self.db,
            self.current_user.id,
            "bank_card_confirmed",
            f"تأیید کارت بانکی | card_id={card.id} | {card.masked_card_number}",
        )
        return card
