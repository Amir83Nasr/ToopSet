from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import jdatetime
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.logger import log_action
from app.core.timezone import now_utc, utc_to_iran
from app.models.booking import BookingSource, BookingStatus, SettlementStatus
from app.models.payment import PaymentStatus
from app.models.refund import Refund, RefundType
from app.models.replacement import (
    BookingHold,
    BookingHoldStatus,
    ReplacementRequestStatus,
)
from app.models.time_slot import SlotStatus
from app.models.user import User
from app.repositories.bank_card_repo import BankCardRepo
from app.repositories.booking_repo import BookingRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.penalty_repo import PenaltyRepo
from app.repositories.replacement_repo import ReplacementRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.wallet_repo import WalletRepo
from app.schemas.booking import (
    AdminBookingListResponse,
    AdminBookingResponse,
    BookingCancellationTermsResponse,
    BookingCancelRequest,
    BookingCreate,
    BookingCreateResponse,
    BookingDetailResponse,
    BookingListResponse,
    PaymentResponse,
    ReplacementHoldResponse,
)
from app.schemas.payment import (
    PaymentResolutionResponse,
    PaymentStartResponse,
    PendingCheckoutResponse,
)
from app.services.bank_card_service import BankCardService
from app.services.cache_service import invalidate_slot_list
from app.services.finance_service import FinanceService
from app.services.payment_service import (
    FraudDetectionError,
    GatewayTimeoutError,
    InsufficientFundsError,
    PaymentError,
    PaymentResult,
    PaymentService,
)
from app.services.sms_provider import send_booking_confirmation_sms_for_booking
from app.services.zibal_gateway import (
    ZibalGatewayError,
    ZibalGatewayService,
    ZibalVerificationError,
)

PUBLIC_BOOKING_WINDOW_DAYS = 14


class BookingService:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.booking_repo = BookingRepo(db)
        self.slot_repo = TimeSlotRepo(db)
        self.payment_repo = PaymentRepo(db)
        self.notify_repo = NotificationRepo(db)
        self.penalty_repo = PenaltyRepo(db)
        self.wallet_repo = WalletRepo(db)
        self.bank_card_repo = BankCardRepo(db)
        self.replacement_repo = ReplacementRepo(db)
        self.db = db
        self.current_user = current_user

    @staticmethod
    def _hold_response(hold: BookingHold) -> ReplacementHoldResponse:
        slot = hold.slot
        vendor = slot.vendor if slot else None
        return ReplacementHoldResponse(
            id=hold.id,
            replacement_request_id=hold.replacement_request_id,
            original_booking_id=hold.replacement_request.original_booking_id,
            replacement_booking_id=hold.replacement_booking_id,
            user_id=hold.user_id,
            slot_id=hold.slot_id,
            status=hold.status,
            price_paid=float(hold.price_paid),
            slot_price=float(hold.slot_price),
            ball_price=float(hold.ball_price or 0),
            with_ball=hold.with_ball,
            expires_at=hold.expires_at,
            failure_code=hold.failure_code,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
        )

    async def _get_verified_bank_card(self, user_id: int):
        return await self.bank_card_repo.get_verified_for_user(user_id)

    async def _require_verified_bank_card(self, user_id: int) -> None:
        card = await self.bank_card_repo.get_verified_for_user(user_id)
        if card is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="برای بازگشت وجه ابتدا باید کارت بانکی تأییدشده ثبت کنید",
            )

    async def _ensure_verified_bank_card(self, card_number: str | None = None) -> None:
        if await self._get_verified_bank_card(self.current_user.id):
            return
        if not card_number:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="برای لغو و بازگشت وجه، شماره کارت را در پروفایل یا همین مرحله وارد کنید",
            )
        card_service = BankCardService(db=self.booking_repo.db, current_user=self.current_user)
        card = await card_service.lookup_card(card_number)
        await card_service.confirm_card(card.id)

    async def _get_owned_booking_for_cancel(self, booking_id: int, *, for_update: bool = False):
        booking = await self.booking_repo.get_by_id(booking_id, for_update=for_update)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )
        return booking

    async def _ensure_single_live_checkout(self) -> None:
        """Serialize checkout creation per user and reject a second live hold."""
        await self.db.execute(select(User).where(User.id == self.current_user.id).with_for_update())
        pending = await self.booking_repo.get_pending_payment_by_user(
            self.current_user.id, for_update=True
        )
        if pending:
            if pending.expires_at and pending.expires_at <= now_utc():
                payment = await self.payment_repo.get_by_booking(pending.id)
                if (
                    payment
                    and payment.status == PaymentStatus.PENDING
                    and payment.gateway_transaction_id
                ):
                    track_id = payment.gateway_transaction_id
                    await self.db.commit()
                    resolution = await self.resolve_zibal_payment(track_id)
                    if resolution.outcome in {"pending", "reconciliation_required"}:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="نتیجه پرداخت قبلی هنوز قطعی نیست؛ تراکنش به صورت خودکار بررسی می‌شود",
                        )
                    await self.db.execute(
                        select(User).where(User.id == self.current_user.id).with_for_update()
                    )
                    pending = await self.booking_repo.get_pending_payment_by_user(
                        self.current_user.id, for_update=True
                    )
                    if not pending:
                        pending = None

            if pending and pending.expires_at and pending.expires_at <= now_utc():
                await self.booking_repo.update(
                    pending,
                    {
                        "status": BookingStatus.EXPIRED,
                        "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                    },
                )
                old_slot = await self.slot_repo.get_by_id(pending.slot_id, for_update=True)
                if old_slot and old_slot.status == SlotStatus.RESERVING:
                    await self.slot_repo.update(
                        old_slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
                    await invalidate_slot_list(old_slot.vendor_id)
            elif pending:
                payment = await self.payment_repo.get_by_booking(pending.id)
                track_id = (
                    payment.gateway_transaction_id
                    if payment and payment.status == PaymentStatus.PENDING
                    else None
                )
                pending_slot = pending.slot
                vendor_name = (
                    pending_slot.vendor.name if (pending_slot and pending_slot.vendor) else ""
                )
                slot_date = ""
                slot_time = ""
                if pending_slot:
                    start_iran = utc_to_iran(pending_slot.start_time)
                    end_iran = utc_to_iran(pending_slot.end_time)
                    slot_date = jdatetime.date.fromgregorian(date=start_iran.date()).strftime(
                        "%Y/%m/%d"
                    )
                    slot_time = f"{start_iran.strftime('%H:%M')} تا {end_iran.strftime('%H:%M')}"
                    booking_details_text = (
                        f"\n\n📋 جزییات رزرو قبلی:\n"
                        f"• کد رزرو: {pending.id}\n"
                        f"• مجموعه: {vendor_name}\n"
                        f"• تاریخ: {slot_date}\n"
                        f"• ساعت: {slot_time}"
                    )
                else:
                    booking_details_text = f"\n\n📋 جزییات رزرو قبلی:\n• کد رزرو: {pending.id}"

                message = (
                    "⚠️ شما یک رزرو در انتظار پرداخت دارید!\n"
                    "لطفاً یا آن رزرو را پرداخت کنید یا داخل درگاه پرداخت انصراف را بزنید تا بتوانید رزرو جدید انجام دهید."
                    f"{booking_details_text}"
                )

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "pending_booking_limit_reached",
                        "severity": "warning",
                        "alert_type": "red_warning",
                        "message": message,
                        "checkout_type": "booking",
                        "booking_id": pending.id,
                        "vendor_name": vendor_name,
                        "slot_date": slot_date,
                        "slot_time": slot_time,
                        "track_id": track_id,
                        "payment_url": (
                            f"{settings.zibal_base_url.rstrip('/')}/start/{track_id}"
                            if track_id
                            else None
                        ),
                        "expires_at": pending.expires_at.isoformat()
                        if pending.expires_at
                        else None,
                    },
                )

        hold = await self.replacement_repo.get_live_hold_for_user(
            self.current_user.id, for_update=True
        )
        if hold:
            if hold.expires_at <= now_utc() and hold.status == BookingHoldStatus.ACTIVE:
                request = await self.replacement_repo.get_request(
                    hold.replacement_request_id, for_update=True
                )
                await self.replacement_repo.update_hold(
                    hold,
                    {
                        "status": BookingHoldStatus.EXPIRED,
                        "processing_token": None,
                        "failure_code": "hold_expired",
                    },
                )
                if request and request.deadline > now_utc():
                    await self.replacement_repo.update_request(
                        request, {"status": ReplacementRequestStatus.OPEN}
                    )
                    if hold.slot.status == SlotStatus.RESERVING:
                        await self.slot_repo.update(
                            hold.slot,
                            {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
                        )
                        await invalidate_slot_list(hold.slot.vendor_id)
            else:
                hold_slot = hold.slot
                vendor_name = hold_slot.vendor.name if (hold_slot and hold_slot.vendor) else ""
                slot_date = ""
                slot_time = ""
                if hold_slot:
                    start_iran = utc_to_iran(hold_slot.start_time)
                    end_iran = utc_to_iran(hold_slot.end_time)
                    slot_date = jdatetime.date.fromgregorian(date=start_iran.date()).strftime(
                        "%Y/%m/%d"
                    )
                    slot_time = f"{start_iran.strftime('%H:%M')} تا {end_iran.strftime('%H:%M')}"
                    hold_details_text = (
                        f"\n\n📋 جزییات فرایند جایگزینی قبلی:\n"
                        f"• کد هولد: {hold.id}\n"
                        f"• مجموعه: {vendor_name}\n"
                        f"• تاریخ: {slot_date}\n"
                        f"• ساعت: {slot_time}"
                    )
                else:
                    hold_details_text = f"\n\n📋 جزییات فرایند جایگزینی قبلی:\n• کد هولد: {hold.id}"

                message = (
                    "⚠️ شما یک فرایند جایگزینی در انتظار پرداخت دارید!\n"
                    "لطفاً یا آن رزرو را پرداخت کنید یا داخل درگاه پرداخت انصراف را بزنید تا بتوانید رزرو جدید انجام دهید."
                    f"{hold_details_text}"
                )

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "pending_booking_limit_reached",
                        "severity": "warning",
                        "alert_type": "red_warning",
                        "message": message,
                        "checkout_type": "replacement_hold",
                        "hold_id": hold.id,
                        "booking_id": hold.id,
                        "vendor_name": vendor_name,
                        "slot_date": slot_date,
                        "slot_time": slot_time,
                        "track_id": hold.gateway_transaction_id,
                        "payment_url": (
                            f"{settings.zibal_base_url.rstrip('/')}/start/"
                            f"{hold.gateway_transaction_id}"
                            if hold.gateway_transaction_id
                            else None
                        ),
                        "expires_at": hold.expires_at.isoformat(),
                    },
                )

    async def get_pending_checkout(self) -> PendingCheckoutResponse | None:
        """Return the user's single live checkout for early frontend routing."""
        pending = await self.booking_repo.get_pending_payment_by_user(self.current_user.id)
        if pending:
            payment = await self.payment_repo.get_by_booking(pending.id)
            has_live_gateway_payment = bool(
                payment
                and payment.status == PaymentStatus.PENDING
                and payment.gateway_transaction_id
            )
            if has_live_gateway_payment or not pending.expires_at or pending.expires_at > now_utc():
                track_id = payment.gateway_transaction_id if has_live_gateway_payment else None
                vendor = pending.slot.vendor if pending.slot else None
                vendor_name = vendor.name if vendor else ""
                can_resume = not pending.expires_at or pending.expires_at > now_utc()
                slot_date = ""
                slot_time = ""
                if pending.slot:
                    start_iran = utc_to_iran(pending.slot.start_time)
                    end_iran = utc_to_iran(pending.slot.end_time)
                    slot_date = jdatetime.date.fromgregorian(date=start_iran.date()).strftime(
                        "%Y/%m/%d"
                    )
                    slot_time = f"{start_iran.strftime('%H:%M')} تا {end_iran.strftime('%H:%M')}"
                    booking_details_text = (
                        f"\n\n📋 جزییات رزرو قبلی:\n"
                        f"• کد رزرو: {pending.id}\n"
                        f"• مجموعه: {vendor_name}\n"
                        f"• تاریخ: {slot_date}\n"
                        f"• ساعت: {slot_time}"
                    )
                else:
                    booking_details_text = f"\n\n📋 جزییات رزرو قبلی:\n• کد رزرو: {pending.id}"

                message = (
                    (
                        "⚠️ شما یک رزرو در انتظار پرداخت دارید!\n"
                        "لطفاً یا آن رزرو را پرداخت کنید یا داخل درگاه پرداخت انصراف را بزنید تا بتوانید رزرو جدید انجام دهید."
                        f"{booking_details_text}"
                    )
                    if can_resume
                    else "مهلت پرداخت تمام شده و نتیجه تراکنش در حال بررسی نهایی است."
                )

                return PendingCheckoutResponse(
                    checkout_type="booking",
                    booking_id=pending.id,
                    vendor_id=pending.slot.vendor_id if pending.slot else None,
                    vendor_name=vendor_name,
                    slot_start_time=pending.slot.start_time if pending.slot else None,
                    slot_end_time=pending.slot.end_time if pending.slot else None,
                    slot_date=slot_date,
                    slot_time=slot_time,
                    track_id=track_id,
                    start_url=(
                        f"{settings.zibal_base_url.rstrip('/')}/start/{track_id}"
                        if track_id and can_resume
                        else None
                    ),
                    can_resume=can_resume,
                    expires_at=pending.expires_at,
                    message=message,
                )

        hold = await self.replacement_repo.get_live_hold_for_user(self.current_user.id)
        if hold and (
            hold.expires_at > now_utc()
            or (hold.status == BookingHoldStatus.PROCESSING and bool(hold.gateway_transaction_id))
        ):
            track_id = hold.gateway_transaction_id
            vendor = hold.slot.vendor if hold.slot else None
            vendor_name = vendor.name if vendor else ""
            can_resume = hold.expires_at > now_utc()
            slot_date = ""
            slot_time = ""
            if hold.slot:
                start_iran = utc_to_iran(hold.slot.start_time)
                end_iran = utc_to_iran(hold.slot.end_time)
                slot_date = jdatetime.date.fromgregorian(date=start_iran.date()).strftime(
                    "%Y/%m/%d"
                )
                slot_time = f"{start_iran.strftime('%H:%M')} تا {end_iran.strftime('%H:%M')}"
                hold_details_text = (
                    f"\n\n📋 جزییات فرایند جایگزینی قبلی:\n"
                    f"• کد هولد: {hold.id}\n"
                    f"• مجموعه: {vendor_name}\n"
                    f"• تاریخ: {slot_date}\n"
                    f"• ساعت: {slot_time}"
                )
            else:
                hold_details_text = f"\n\n📋 جزییات فرایند جایگزینی قبلی:\n• کد هولد: {hold.id}"

            message = (
                (
                    "⚠️ شما یک فرایند جایگزینی در انتظار پرداخت دارید!\n"
                    "لطفاً یا آن رزرو را پرداخت کنید یا داخل درگاه پرداخت انصراف را بزنید تا بتوانید رزرو جدید انجام دهید."
                    f"{hold_details_text}"
                )
                if can_resume
                else "مهلت پرداخت جایگزینی تمام شده و نتیجه تراکنش در حال بررسی است."
            )

            return PendingCheckoutResponse(
                checkout_type="replacement_hold",
                booking_id=hold.id,
                vendor_id=hold.slot.vendor_id if hold.slot else None,
                vendor_name=vendor_name,
                slot_start_time=hold.slot.start_time if hold.slot else None,
                slot_end_time=hold.slot.end_time if hold.slot else None,
                slot_date=slot_date,
                slot_time=slot_time,
                track_id=track_id,
                start_url=(
                    f"{settings.zibal_base_url.rstrip('/')}/start/{track_id}"
                    if track_id and can_resume
                    else None
                ),
                can_resume=can_resume,
                expires_at=hold.expires_at,
                message=message,
            )
        return None

    async def get_cancellation_terms(self, booking_id: int) -> BookingCancellationTermsResponse:
        booking = await self._get_owned_booking_for_cancel(booking_id)
        slot = booking.slot
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")

        rules = [
            "رزرو در انتظار پرداخت فقط از داخل درگاه یا پس از پایان مهلت پرداخت تعیین تکلیف می‌شود.",
            "برای رزروهای تأییدشده، ثبت کارت بانکی تأییدشده جهت بازگشت وجه الزامی است.",
            "اگر بیش از ۴۸ ساعت تا شروع سانس باقی مانده باشد، رزرو لغو می‌شود و ۹۰٪ مبلغ پرداختی عودت می‌شود.",
            "اگر ۴۸ ساعت یا کمتر تا شروع سانس باقی مانده باشد، رزرو در انتظار جایگزین قرار می‌گیرد و فقط در صورت جایگزینی با کسر ۱۰٪ عودت می‌شود.",
            "پس از شروع سانس، لغو توسط کاربر امکان‌پذیر نیست.",
        ]

        if booking.status in (BookingStatus.CANCELLED, BookingStatus.TRANSFERRED):
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=False,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="already_cancelled",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
                blocking_reason="این رزرو قبلاً لغو شده است",
            )
        if booking.status == BookingStatus.PENDING_CANCELLATION:
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=False,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="already_pending_cancellation",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
                blocking_reason="این رزرو قبلاً در انتظار جایگزین قرار گرفته است",
            )
        if booking.status not in (BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED):
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=False,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="not_cancellable",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
                blocking_reason="این رزرو در وضعیت قابل لغو نیست",
            )
        if slot.start_time <= now_utc():
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=False,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="started",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
                blocking_reason="زمان این سانس گذشته یا شروع شده و دیگر قابل لغو نیست",
            )
        if booking.status == BookingStatus.PENDING_PAYMENT:
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=False,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="pending_payment",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
                blocking_reason=(
                    "برای لغو، وارد درگاه پرداخت شوید و گزینه لغو پرداخت را انتخاب کنید. "
                    "استفاده از دکمه بازگشت مرورگر، پرداخت را لغو نمی‌کند."
                ),
            )

        has_card = bool(await self._get_verified_bank_card(booking.user_id))
        time_until_slot = slot.start_time - now_utc()
        if time_until_slot <= timedelta(hours=48):
            penalty_amount = Decimal(str(booking.price_paid)) * Decimal("0.10")
            refund_amount = Decimal(str(booking.price_paid)) - penalty_amount
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=True,
                requires_bank_card=True,
                has_verified_bank_card=has_card,
                mode="pending_replacement",
                refund_amount=float(refund_amount),
                penalty_amount=float(penalty_amount),
                rules=rules,
            )

        penalty_amount = Decimal(str(booking.price_paid)) * Decimal("0.10")
        refund_amount = Decimal(str(booking.price_paid)) - penalty_amount
        return BookingCancellationTermsResponse(
            booking_id=booking.id,
            can_cancel=True,
            requires_bank_card=True,
            has_verified_bank_card=has_card,
            mode="refund_with_penalty",
            refund_amount=float(refund_amount),
            penalty_amount=float(penalty_amount),
            rules=rules,
        )

    async def _build_booking_detail_list(
        self, bookings: list, with_payment: bool = False
    ) -> list[BookingDetailResponse]:
        """Shared helper: maps Booking rows to BookingDetailResponse, slot/vendor loaded via selectinload."""
        # Batch-load payments when requested — avoids N+1 per booking
        payment_map: dict[int, PaymentResponse] = {}
        if with_payment and bookings:
            payment_objs = await self.payment_repo.get_by_booking_ids([b.id for b in bookings])
            payment_map = {
                bk_id: PaymentResponse.model_validate(p) for bk_id, p in payment_objs.items()
            }
        refund_map: dict[int, Refund] = {}
        if bookings:
            refund_rows = await self.booking_repo.db.execute(
                select(Refund)
                .where(Refund.booking_id.in_([b.id for b in bookings]))
                .order_by(Refund.requested_at.desc())
            )
            for refund in refund_rows.scalars().all():
                refund_map.setdefault(refund.booking_id, refund)
        result = []
        for b in bookings:
            slot = b.slot  # already loaded via selectinload in the repo
            vendor = slot.vendor if slot else None
            payment = payment_map.get(b.id) if with_payment else None
            refund = refund_map.get(b.id)
            result.append(
                BookingDetailResponse(
                    id=b.id,
                    user_id=b.user_id,
                    slot_id=b.slot_id,
                    status=b.status,
                    price_paid=float(b.price_paid),
                    slot_price=float(b.slot_price) if b.slot_price is not None else None,
                    ball_price=float(b.ball_price or 0),
                    with_ball=b.with_ball,
                    penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    expires_at=b.expires_at,
                    vendor_name=vendor.name if vendor else "",
                    vendor_address=vendor.address if vendor else "",
                    slot_start_time=slot.start_time if slot else None,
                    slot_end_time=slot.end_time if slot else None,
                    payment=payment,
                    refund_status=refund.status.value if refund else None,
                    refund_amount=float(refund.refund_amount) if refund else None,
                    refund_penalty_amount=float(refund.penalty_amount) if refund else None,
                    refund_requested_at=refund.requested_at if refund else None,
                    refund_approved_at=refund.approved_at if refund else None,
                    refund_paid_at=refund.paid_at if refund else None,
                    refund_payment_tracking_code=(refund.payment_tracking_code if refund else None),
                    refund_destination_card_masked=(
                        refund.destination_card_masked if refund else None
                    ),
                )
            )
        return result

    async def list_my_bookings(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> BookingListResponse:
        reference = now_utc()
        bookings, total = await self.booking_repo.list_by_user(
            self.current_user.id,
            after_id=after_id,
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            category=category,
            search=search,
            now=reference,
        )
        next_cursor = None
        if bookings and len(bookings) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(bookings[-1].id)
        result = await self._build_booking_detail_list(bookings, with_payment=True)
        category_counts = await self.booking_repo.count_categories_by_user(
            self.current_user.id, now=reference
        )
        return BookingListResponse(
            bookings=result,
            total=total,
            next_cursor=next_cursor,
            category_counts=category_counts,
        )

    async def list_completed_bookings(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> BookingListResponse:
        bookings, total = await self.booking_repo.list_completed_by_user(
            self.current_user.id, after_id=after_id, skip=skip, limit=limit
        )
        next_cursor = None
        if bookings and len(bookings) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(bookings[-1].id)
        result = await self._build_booking_detail_list(bookings)
        return BookingListResponse(bookings=result, total=total, next_cursor=next_cursor)

    async def get_booking(self, booking_id: int) -> BookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )

        slot = booking.slot  # loaded via selectinload
        vendor = slot.vendor if slot else None
        payment = await self.payment_repo.get_by_booking(booking_id)
        refund = (
            await self.booking_repo.db.execute(
                select(Refund)
                .where(Refund.booking_id == booking_id)
                .order_by(Refund.requested_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
            ball_price=float(booking.ball_price or 0),
            with_ball=booking.with_ball,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment) if payment else None,
            refund_status=refund.status.value if refund else None,
            refund_amount=float(refund.refund_amount) if refund else None,
            refund_penalty_amount=float(refund.penalty_amount) if refund else None,
            refund_requested_at=refund.requested_at if refund else None,
            refund_approved_at=refund.approved_at if refund else None,
            refund_paid_at=refund.paid_at if refund else None,
            refund_payment_tracking_code=refund.payment_tracking_code if refund else None,
            refund_destination_card_masked=(refund.destination_card_masked if refund else None),
        )

    async def create_booking(self, data: BookingCreate) -> BookingCreateResponse:
        if (
            self.current_user.role == "user"
            and not settings.is_development_or_bootstrap
            and not self.current_user.phone_verified_at
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "phone_verification_required",
                    "message": "برای رزرو سانس ابتدا شماره موبایل خود را با کد پیامکی تأیید کنید",
                },
            )
        await self._ensure_single_live_checkout()
        slot = await self.slot_repo.get_by_id(data.slot_id, for_update=True)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        vendor = slot.vendor
        if not vendor or not vendor.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این مجموعه هنوز توسط ادمین تأیید نشده است",
            )
        if slot.status in (SlotStatus.CLOSED, SlotStatus.BLOCKED, SlotStatus.DISABLED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس بسته شده است"
            )
        if slot.start_time <= now_utc():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="زمان این سانس گذشته و دیگر قابل رزرو نیست",
            )
        if slot.start_time > now_utc() + timedelta(days=PUBLIC_BOOKING_WINDOW_DAYS):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="رزرو فقط برای سانس‌های دو هفته آینده امکان‌پذیر است",
            )
        if data.with_ball and not vendor.ball_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="امکان رزرو توپ برای این مجموعه وجود ندارد",
            )
        if slot.is_reserved and slot.status != SlotStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس قبلاً رزرو شده است"
            )

        if slot.version != data.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این سانس تغییر کرده است. لطفاً صفحه را به‌روز کنید.",
            )

        existing = await self.booking_repo.get_active_by_slot(data.slot_id, for_update=True)
        if existing and existing.status == BookingStatus.PENDING_CANCELLATION:
            if existing.user_id == self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="رزرو قبلی شما برای این سانس در انتظار جایگزین است",
                )
            request = await self.replacement_repo.get_request_by_original(
                existing.id, for_update=True
            )
            if request is None:
                penalty_amount = Decimal(str(existing.price_paid)) * Decimal("0.10")
                request = await self.replacement_repo.create_request(
                    {
                        "original_booking_id": existing.id,
                        "slot_id": slot.id,
                        "status": ReplacementRequestStatus.OPEN,
                        "penalty_amount": penalty_amount,
                        "refund_amount": Decimal(str(existing.price_paid)) - penalty_amount,
                        "deadline": slot.start_time,
                    }
                )
            if request.deadline <= now_utc():
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.EXPIRED}
                )
                await self.booking_repo.update(
                    existing, {"status": BookingStatus.CONFIRMED, "penalty_amount": None}
                )
                await self.slot_repo.update(
                    slot, {"status": SlotStatus.RESERVED, "is_reserved": True}
                )
                await invalidate_slot_list(slot.vendor_id)
                await self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="مهلت جایگزینی این سانس تمام شده است",
                )

            live_hold = await self.replacement_repo.get_live_hold_for_request(
                request.id, for_update=True
            )
            if live_hold and live_hold.expires_at <= now_utc():
                await self.replacement_repo.update_hold(
                    live_hold,
                    {
                        "status": BookingHoldStatus.EXPIRED,
                        "processing_token": None,
                        "failure_code": "hold_expired",
                    },
                )
                live_hold = None
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.OPEN}
                )
            if live_hold or request.status != ReplacementRequestStatus.OPEN:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="این سانس در حال حاضر در اختیار متقاضی جایگزین دیگری است",
                )

            slot_price = Decimal(str(slot.base_price))
            ball_price = Decimal(str(vendor.ball_price or 0)) if data.with_ball else Decimal("0")
            hold = await self.replacement_repo.create_hold(
                {
                    "replacement_request_id": request.id,
                    "slot_id": slot.id,
                    "user_id": self.current_user.id,
                    "status": BookingHoldStatus.ACTIVE,
                    "price_paid": slot_price + ball_price,
                    "slot_price": slot_price,
                    "ball_price": ball_price,
                    "with_ball": data.with_ball,
                    "expires_at": min(now_utc() + timedelta(minutes=10), request.deadline),
                }
            )
            await self.replacement_repo.update_request(
                request, {"status": ReplacementRequestStatus.HELD}
            )
            await self.slot_repo.update(slot, {"status": SlotStatus.RESERVING, "is_reserved": True})
            await invalidate_slot_list(slot.vendor_id)
            await log_action(
                self.db,
                self.current_user.id,
                "replacement_hold_created",
                f"هولد جایگزینی ساخته شد | هولد {hold.id} — رزرو قبلی {existing.id}",
            )
            loaded_hold = await self.replacement_repo.get_hold(hold.id)
            assert loaded_hold is not None
            return self._hold_response(loaded_hold)
        elif existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس قبلاً رزرو شده است"
            )

        slot_price = Decimal(str(slot.base_price))
        ball_price = Decimal(str(vendor.ball_price or 0)) if data.with_ball else Decimal("0")
        final_price = slot_price + ball_price

        booking = await self.booking_repo.create(
            {
                "user_id": self.current_user.id,
                "slot_id": data.slot_id,
                "replaces_booking_id": None,
                "status": BookingStatus.PENDING_PAYMENT,
                "source": BookingSource.ONLINE,
                "settlement_status": SettlementStatus.NOT_SETTLED,
                "price_paid": final_price,
                "slot_price": slot_price,
                "ball_price": ball_price,
                "with_ball": data.with_ball,
                "expires_at": now_utc() + timedelta(minutes=10),
            }
        )
        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVING})
        await invalidate_slot_list(slot.vendor_id)

        # Notify manager about new booking
        if vendor:
            await self.notify_repo.create(
                user_id=vendor.manager_id,
                type_="booking_created",
                message=f"رزرو جدید برای {vendor.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')}",
            )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "booking_created",
            f"ایجاد رزرو | رزرو {booking.id} برای سانس {data.slot_id} - مجموعه {vendor.name}",
        )

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
            ball_price=float(booking.ball_price or 0),
            with_ball=booking.with_ball,
            penalty_amount=None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=None,
        )

    async def _record_failed_payment(
        self, booking_id: int, amount: float, reason: str = "نامشخص"
    ) -> None:
        await self.payment_repo.create(
            {
                "booking_id": booking_id,
                "amount": amount,
                "gateway_transaction_id": None,
                "status": "failed",
            }
        )
        await self.notify_repo.create(
            user_id=self.current_user.id,
            type_="booking_failed",
            message=f"پرداخت ناموفق: {reason}",
        )
        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "payment_failed",
            f"پرداخت ناموفق | رزرو {booking_id} — مبلغ {amount} تومان — دلیل: {reason}",
        )
        # HTTPException raised by the caller triggers the request dependency's
        # rollback. Persist the append-only payment attempt and audit trail first.
        await self.db.commit()

    async def _start_zibal_payment(self, booking_id: int):
        booking = await self.booking_repo.get_by_id(booking_id, for_update=True)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )
        if booking.status != BookingStatus.PENDING_PAYMENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="این رزرو در وضعیت پرداخت نیست"
            )

        slot = booking.slot
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        latest_payment = await self.payment_repo.get_by_booking(booking_id)
        if booking.expires_at and booking.expires_at < now_utc():
            if (
                latest_payment
                and latest_payment.status == PaymentStatus.PENDING
                and latest_payment.gateway_transaction_id
            ):
                track_id = latest_payment.gateway_transaction_id
                await self.db.commit()
                resolution = await self.resolve_zibal_payment(track_id)
                if resolution.outcome == "paid":
                    return await self.get_booking(booking_id)
                if resolution.outcome in {"pending", "reconciliation_required"}:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="نتیجه تراکنش هنوز قطعی نیست و رزرو تا تعیین تکلیف آزاد نمی‌شود",
                    )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="پرداخت انجام نشد و رزرو موقت آزاد شد",
                )
            is_replacement = booking.replaces_booking_id is not None
            await self.booking_repo.update(
                booking,
                {
                    "status": BookingStatus.EXPIRED,
                    "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                },
            )
            if slot and slot.status == SlotStatus.RESERVING:
                if is_replacement:
                    old_booking = await self.booking_repo.get_by_id(
                        booking.replaces_booking_id, for_update=True
                    )
                    if old_booking and old_booking.status == BookingStatus.PENDING_CANCELLATION:
                        await self.slot_repo.update(
                            slot,
                            {"is_reserved": True, "status": SlotStatus.PENDING_CANCELLATION},
                        )
                    else:
                        await self.slot_repo.update(
                            slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                        )
                else:
                    await self.slot_repo.update(
                        slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
            if slot:
                await invalidate_slot_list(slot.vendor_id)
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="مهلت پرداخت این رزرو تمام شده است",
            )

        is_replacement = booking.replaces_booking_id is not None
        if slot.status in (SlotStatus.CLOSED, SlotStatus.BLOCKED, SlotStatus.DISABLED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس بسته شده است"
            )
        if slot.is_reserved and not is_replacement:
            active = await self.booking_repo.get_active_by_slot(slot.id, for_update=True)
            if slot.status == SlotStatus.RESERVING and active and active.id == booking.id:
                pass
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="این سانس قبلاً رزرو شده است",
                )
        if is_replacement and slot.status != SlotStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این سانس دیگر در وضعیت جایگزینی نیست",
            )

        if latest_payment and latest_payment.status == PaymentStatus.PENDING:
            if latest_payment.gateway_transaction_id:
                return self._zibal_start_response(
                    booking_id=booking.id,
                    payment_id=latest_payment.id,
                    amount=booking.price_paid,
                    track_id=latest_payment.gateway_transaction_id,
                    expires_at=booking.expires_at,
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="نتیجه پرداخت قبلی هنوز مشخص نشده است؛ برای جلوگیری از برداشت تکراری دوباره پرداخت نکنید",
            )

        processing_token = uuid4().hex
        payment = await self.payment_repo.create(
            {
                "booking_id": booking_id,
                "amount": booking.price_paid,
                "status": "pending",
                "idempotency_key": f"booking:{booking_id}:{processing_token}",
                "processing_token": processing_token,
            }
        )
        payment_id = payment.id
        await self.db.commit()

        gateway = ZibalGatewayService()
        try:
            result = await gateway.request_payment(
                amount=booking.price_paid,
                callback_url=settings.zibal_callback_url,
                order_id=str(booking_id),
                mobile=booking.user.phone if booking.user else None,
            )
        except ZibalGatewayError as exc:
            payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": "failed",
                        "processing_token": None,
                        "failure_code": exc.code,
                    },
                )
                await self.db.commit()
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
        if payment and payment.processing_token == processing_token:
            await self.payment_repo.update(
                payment,
                {
                    "gateway_transaction_id": result.track_id,
                    "gateway_name": "zibal",
                    "processing_token": None,
                    "failure_code": None,
                },
            )
            await self.db.commit()

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "payment_started",
            f"شروع پرداخت زیبال | رزرو {booking_id} — trackId {result.track_id}",
        )
        return self._zibal_start_response(
            booking_id=booking.id,
            payment_id=payment_id,
            amount=booking.price_paid,
            track_id=result.track_id,
            expires_at=booking.expires_at,
        )

    def _zibal_start_response(
        self,
        *,
        booking_id: int,
        payment_id: int,
        amount: Decimal,
        track_id: str,
        expires_at: datetime | None,
    ):
        return PaymentStartResponse(
            booking_id=booking_id,
            payment_id=payment_id,
            amount=float(amount),
            track_id=str(track_id),
            start_url=f"{settings.zibal_base_url.rstrip('/')}/start/{track_id}",
            callback_url=settings.zibal_callback_url,
            expires_at=expires_at,
        )

    async def _expire_zibal_booking_checkout(self, track_id: str) -> bool:
        """Expire an unpaid Zibal checkout after the local booking deadline."""
        payment = await self.payment_repo.get_by_gateway_transaction_id(track_id, for_update=True)
        if not payment or payment.status != PaymentStatus.PENDING:
            await self.db.rollback()
            return False

        booking = await self.booking_repo.get_by_id(payment.booking_id, for_update=True)
        if (
            not booking
            or booking.user_id != self.current_user.id
            or booking.status != BookingStatus.PENDING_PAYMENT
            or not booking.expires_at
            or booking.expires_at > now_utc()
        ):
            await self.db.rollback()
            return False

        slot = await self.slot_repo.get_by_id(booking.slot_id, for_update=True)
        await self.payment_repo.update(
            payment,
            {
                "status": PaymentStatus.EXPIRED,
                "processing_token": None,
                "failure_code": "zibal_checkout_expired",
            },
        )
        await self.booking_repo.update(
            booking,
            {
                "status": BookingStatus.EXPIRED,
                "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
            },
        )

        if slot and slot.status == SlotStatus.RESERVING:
            if booking.replaces_booking_id:
                original = await self.booking_repo.get_by_id(
                    booking.replaces_booking_id, for_update=True
                )
                if original and original.status == BookingStatus.PENDING_CANCELLATION:
                    await self.slot_repo.update(
                        slot,
                        {
                            "is_reserved": True,
                            "status": SlotStatus.PENDING_CANCELLATION,
                        },
                    )
                else:
                    await self.slot_repo.update(
                        slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
            else:
                await self.slot_repo.update(slot, {"is_reserved": False, "status": SlotStatus.OPEN})
            await invalidate_slot_list(slot.vendor_id)

        await log_action(
            self.db,
            self.current_user.id,
            "payment_expired",
            f"مهلت پرداخت زیبال پایان یافت | رزرو {booking.id}",
            severity="WARNING",
        )
        await self.db.commit()
        return True

    async def resolve_zibal_payment(self, track_id: str) -> PaymentResolutionResponse:
        """Resolve a Zibal transaction into a stable, client-safe outcome."""
        payment = await self.payment_repo.get_by_gateway_transaction_id(track_id)
        hold = None
        booking_id = None
        payment_id = None
        ref_id = None

        if payment:
            booking = await self.booking_repo.get_by_id(payment.booking_id)
            if not booking:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
            if booking.user_id != self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="شما به این رزرو دسترسی ندارید",
                )
            booking_id = booking.id
            payment_id = payment.id
            ref_id = payment.ref_id
            if payment.status == PaymentStatus.SUCCESS:
                outcome = (
                    "paid"
                    if booking.status == BookingStatus.CONFIRMED
                    else "reconciliation_required"
                )
                return PaymentResolutionResponse(
                    outcome=outcome,
                    track_id=track_id,
                    payment_id=payment.id,
                    booking_id=booking.id,
                    ref_id=payment.ref_id,
                    message=(
                        "پرداخت با موفقیت ثبت شد."
                        if outcome == "paid"
                        else "پرداخت ثبت شده اما نهایی‌سازی رزرو نیازمند بررسی پشتیبانی است."
                    ),
                )
            if payment.status in (PaymentStatus.FAILED, PaymentStatus.EXPIRED):
                return PaymentResolutionResponse(
                    outcome="failed",
                    track_id=track_id,
                    payment_id=payment.id,
                    booking_id=booking.id,
                    ref_id=payment.ref_id,
                    message="پرداخت انجام نشد و سانس آزاد شد.",
                )
        else:
            hold = await self.replacement_repo.get_hold_by_gateway_transaction_id(track_id)
            if not hold:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="پرداخت یافت نشد")
            if hold.user_id != self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="شما به این هولد دسترسی ندارید",
                )
            payment_id = hold.id
            booking_id = hold.replacement_booking_id
            ref_id = hold.ref_id
            if hold.status == BookingHoldStatus.PAID:
                return PaymentResolutionResponse(
                    outcome="paid",
                    track_id=track_id,
                    payment_id=hold.id,
                    booking_id=hold.replacement_booking_id,
                    ref_id=hold.ref_id,
                    message="پرداخت و انتقال رزرو با موفقیت ثبت شد.",
                )
            if hold.status in (
                BookingHoldStatus.FAILED,
                BookingHoldStatus.EXPIRED,
                BookingHoldStatus.CANCELLED,
            ):
                return PaymentResolutionResponse(
                    outcome="failed",
                    track_id=track_id,
                    payment_id=hold.id,
                    booking_id=hold.replacement_booking_id,
                    ref_id=hold.ref_id,
                    message="پرداخت انجام نشد و درخواست جایگزینی دوباره در دسترس قرار گرفت.",
                )

        try:
            detail = await self.verify_zibal_payment(track_id)
        except HTTPException:
            # Verification failures are classified with inquiry. Callback query flags are
            # intentionally ignored because only Zibal's server-to-server state is trusted.
            gateway = ZibalGatewayService()
            try:
                inquiry = await gateway.inquiry_payment(track_id)
            except ZibalGatewayError:
                await self.db.rollback()
                return PaymentResolutionResponse(
                    outcome="reconciliation_required",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=ref_id,
                    message="ارتباط با درگاه برقرار نشد؛ تراکنش به صورت خودکار دوباره بررسی می‌شود.",
                )

            if inquiry.verified:
                return PaymentResolutionResponse(
                    outcome="reconciliation_required",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=inquiry.ref_id or ref_id,
                    message="درگاه پرداخت را موفق اعلام کرده اما نهایی‌سازی نیازمند بررسی است.",
                )
            if inquiry.payment_status == -1:
                if payment and await self._expire_zibal_booking_checkout(track_id):
                    return PaymentResolutionResponse(
                        outcome="failed",
                        track_id=track_id,
                        payment_id=payment_id,
                        booking_id=booking_id,
                        ref_id=inquiry.ref_id or ref_id,
                        message="مهلت پرداخت تمام شد و سانس آزاد شد.",
                    )
                if hold and hold.expires_at <= now_utc() and hold.processing_token:
                    await self._fail_replacement_payment(
                        hold.id,
                        hold.processing_token,
                        failure_code="zibal_checkout_expired",
                        failure_message="مهلت پرداخت زیبال پایان یافت",
                    )
                    return PaymentResolutionResponse(
                        outcome="failed",
                        track_id=track_id,
                        payment_id=payment_id,
                        booking_id=booking_id,
                        ref_id=inquiry.ref_id or ref_id,
                        message="مهلت پرداخت جایگزینی تمام شد.",
                    )
                return PaymentResolutionResponse(
                    outcome="pending",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=inquiry.ref_id or ref_id,
                    message="نتیجه تراکنش هنوز از طرف درگاه نهایی نشده است.",
                )
            if inquiry.payment_status is None:
                return PaymentResolutionResponse(
                    outcome="pending",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=inquiry.ref_id or ref_id,
                    message="نتیجه تراکنش هنوز از طرف درگاه نهایی نشده است.",
                )
            if inquiry.payment_status == 2:
                return PaymentResolutionResponse(
                    outcome="reconciliation_required",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=inquiry.ref_id or ref_id,
                    message="پرداخت درگاه هنوز verify نشده و دوباره بررسی خواهد شد.",
                )
            if inquiry.result == 100:
                await self._record_failed_zibal_attempt(track_id, inquiry.message or "failed")
                return PaymentResolutionResponse(
                    outcome="failed",
                    track_id=track_id,
                    payment_id=payment_id,
                    booking_id=booking_id,
                    ref_id=inquiry.ref_id or ref_id,
                    message="پرداخت انجام نشد و رزرو موقت آزاد شد.",
                )
            return PaymentResolutionResponse(
                outcome="reconciliation_required",
                track_id=track_id,
                payment_id=payment_id,
                booking_id=booking_id,
                ref_id=inquiry.ref_id or ref_id,
                message="پاسخ درگاه قطعی نیست؛ تراکنش به صورت خودکار دوباره بررسی می‌شود.",
            )

        return PaymentResolutionResponse(
            outcome="paid",
            track_id=track_id,
            payment_id=payment_id,
            booking_id=detail.id,
            ref_id=(detail.payment.ref_id if detail.payment else ref_id),
            message="پرداخت با موفقیت ثبت شد.",
        )

    async def verify_zibal_payment(self, track_id: str) -> BookingDetailResponse:
        # ── Step 1: lock payment row first to prevent concurrent verify calls ──
        payment = await self.payment_repo.get_by_gateway_transaction_id(track_id, for_update=True)
        if not payment:
            hold = await self.replacement_repo.get_hold_by_gateway_transaction_id(
                track_id, for_update=True
            )
            if hold:
                return await self._verify_zibal_replacement_hold(hold, track_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="پرداخت یافت نشد")
        booking = await self.booking_repo.get_by_id(payment.booking_id, for_update=True)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )

        # ── Step 2: idempotent — already confirmed ────────────────────
        if payment.status == PaymentStatus.SUCCESS and booking.status == BookingStatus.CONFIRMED:
            return await self.get_booking(booking.id)

        # ── Step 3: release DB locks before the blocking network call ──
        # Save the IDs so we can re-acquire locks after the gateway responds.
        payment_id = payment.id
        booking_id_inner = booking.id
        expected_amount = payment.amount  # Toman, as stored in DB
        await self.db.commit()

        # ── Step 4: call Zibal — this can block for several seconds ───
        gateway = ZibalGatewayService()
        try:
            result = await gateway.verify_payment(track_id)
        except ZibalVerificationError as exc:
            await self._record_failed_zibal_attempt(track_id, str(exc))
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        # ── Step 5: re-acquire locks after the external call ──────────
        payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
        booking = await self.booking_repo.get_by_id(booking_id_inner, for_update=True)
        if not payment or not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")

        # ── Step 6: idempotent check again after re-locking ──────────
        if payment.status == PaymentStatus.SUCCESS and booking.status == BookingStatus.CONFIRMED:
            return await self.get_booking(booking.id)

        slot = booking.slot
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")

        # ── Step 7: amount mismatch guard ─────────────────────────────
        if result.paid_amount is not None:
            tolerance = Decimal("1")  # 1 toman tolerance for rounding
            if abs(result.paid_amount - expected_amount) > tolerance:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": PaymentStatus.SUCCESS,
                        "gateway_name": "zibal",
                        "ref_id": result.ref_id,
                        "paid_at": now_utc(),
                        "processing_token": None,
                        "failure_code": "amount_mismatch",
                    },
                )
                await log_action(
                    self.booking_repo.db,
                    self.current_user.id,
                    "payment_amount_mismatch",
                    f"تأیید پرداخت زیبال — عدم تطابق مبلغ | رزرو {booking.id} "
                    f"انتظار {expected_amount} تومان، زیبال {result.paid_amount} تومان اعلام کرد",
                    severity="CRITICAL",
                )
                await self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="مبلغ پرداخت‌شده با مبلغ رزرو مطابقت ندارد. لطفاً با پشتیبانی تماس بگیرید.",
                )

        # ── Step 8: booking no longer payable (raced with cancel etc.) ─
        if booking.status != BookingStatus.PENDING_PAYMENT:
            await self.payment_repo.update(
                payment,
                {
                    "status": PaymentStatus.SUCCESS,
                    "gateway_name": "zibal",
                    "ref_id": result.ref_id,
                    "paid_at": now_utc(),
                    "processing_token": None,
                    "failure_code": "paid_but_booking_not_payable",
                },
            )
            await log_action(
                self.booking_repo.db,
                self.current_user.id,
                "payment_reconciliation_required",
                f"پرداخت رزرو {booking.id} موفق شد اما وضعیت رزرو {booking.status.value} است",
                severity="CRITICAL",
            )
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پرداخت انجام شده اما نهایی‌سازی رزرو نیازمند بررسی پشتیبانی است.",
            )

        # ── Step 9: finalize ──────────────────────────────────────────
        await self.payment_repo.update(
            payment,
            {
                "status": "success",
                "gateway_name": "zibal",
                "gateway_transaction_id": track_id,
                "ref_id": result.ref_id,
                "paid_at": now_utc(),
                "processing_token": None,
                "failure_code": None,
            },
        )
        await self.booking_repo.update(
            booking,
            {
                "status": BookingStatus.CONFIRMED,
                "settlement_status": SettlementStatus.NOT_SETTLED,
            },
        )
        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVED})
        await invalidate_slot_list(slot.vendor_id)
        await self.db.commit()
        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "payment_verified",
            f"تأیید پرداخت زیبال | رزرو {booking.id} — trackId {track_id}",
        )
        await send_booking_confirmation_sms_for_booking(booking)
        return await self.get_booking(booking.id)

    async def _verify_zibal_replacement_hold(
        self, hold: BookingHold, track_id: str
    ) -> BookingDetailResponse:
        if hold.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این هولد دسترسی ندارید"
            )
        if hold.status == BookingHoldStatus.PAID and hold.replacement_booking_id:
            return await self.get_booking(hold.replacement_booking_id)
        if hold.status != BookingHoldStatus.PROCESSING or not hold.processing_token:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این هولد دیگر در وضعیت پرداخت نیست",
            )

        hold_id = hold.id
        processing_token = hold.processing_token
        expected_amount = hold.price_paid
        await self.db.commit()

        gateway = ZibalGatewayService()
        try:
            result = await gateway.verify_payment(track_id)
        except ZibalVerificationError as exc:
            await self._record_failed_zibal_attempt(track_id, str(exc))
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
        if not hold:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="هولد یافت نشد")
        if hold.status == BookingHoldStatus.PAID and hold.replacement_booking_id:
            return await self.get_booking(hold.replacement_booking_id)
        if hold.processing_token != processing_token:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="نتیجه پرداخت نیازمند بررسی پشتیبانی است",
            )

        if result.paid_amount is not None and abs(result.paid_amount - expected_amount) > Decimal(
            "1"
        ):
            await self.replacement_repo.update_hold(
                hold,
                {
                    "gateway_name": "zibal",
                    "ref_id": result.ref_id,
                    "paid_at": now_utc(),
                    "failure_code": "amount_mismatch",
                },
            )
            await log_action(
                self.db,
                self.current_user.id,
                "replacement_payment_amount_mismatch",
                f"عدم تطابق مبلغ هولد {hold.id}: انتظار {expected_amount}، زیبال {result.paid_amount}",
                severity="CRITICAL",
            )
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="مبلغ پرداخت‌شده با مبلغ هولد مطابقت ندارد. لطفاً با پشتیبانی تماس بگیرید.",
            )

        payment_result = PaymentResult(
            transaction_id=track_id,
            gateway_name="zibal",
            card_number="",
            paid_at=now_utc(),
            ref_id=result.ref_id or "",
            fee=0,
        )
        return await self._finalize_replacement_payment(hold_id, processing_token, payment_result)

    async def _finalize_replacement_payment(
        self, hold_id: int, processing_token: str, result: PaymentResult
    ) -> BookingDetailResponse:
        hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
        if not hold or hold.processing_token != processing_token:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="نتیجه پرداخت نیازمند بررسی پشتیبانی است",
            )
        request = await self.replacement_repo.get_request(
            hold.replacement_request_id, for_update=True
        )
        original = (
            await self.booking_repo.get_by_id(request.original_booking_id, for_update=True)
            if request
            else None
        )
        slot = await self.slot_repo.get_by_id(hold.slot_id, for_update=True)
        vendor = slot.vendor if slot else None
        now = now_utc()
        if (
            request is None
            or original is None
            or slot is None
            or request.status != ReplacementRequestStatus.HELD
            or original.status != BookingStatus.PENDING_CANCELLATION
            or request.deadline <= now
        ):
            await self.replacement_repo.update_hold(
                hold,
                {
                    "status": BookingHoldStatus.FAILED,
                    "processing_token": None,
                    "gateway_transaction_id": result.transaction_id,
                    "gateway_name": result.gateway_name,
                    "card_number": result.card_number or None,
                    "ref_id": result.ref_id or None,
                    "gateway_fee": Decimal(str(result.fee)),
                    "paid_at": result.paid_at,
                    "failure_code": "paid_but_transfer_conflicted",
                },
            )
            if (
                request
                and original
                and slot
                and request.deadline <= now
                and original.status == BookingStatus.PENDING_CANCELLATION
            ):
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.EXPIRED}
                )
                await self.booking_repo.update(
                    original, {"status": BookingStatus.CONFIRMED, "penalty_amount": None}
                )
                await self.slot_repo.update(
                    slot, {"status": SlotStatus.RESERVED, "is_reserved": True}
                )
                await invalidate_slot_list(slot.vendor_id)
            await log_action(
                self.db,
                self.current_user.id,
                "replacement_payment_reconciliation_required",
                f"پرداخت هولد {hold_id} موفق شد اما انتقال مالکیت انجام نشد",
                severity="CRITICAL",
            )
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پرداخت ثبت شد اما انتقال رزرو نیازمند بررسی پشتیبانی است",
            )

        await self.booking_repo.update(
            original,
            {
                "status": BookingStatus.TRANSFERRED,
                "penalty_amount": request.penalty_amount,
                "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_REFUND,
            },
        )
        replacement = await self.booking_repo.create(
            {
                "user_id": hold.user_id,
                "slot_id": hold.slot_id,
                "replaces_booking_id": original.id,
                "status": BookingStatus.CONFIRMED,
                "source": BookingSource.ONLINE,
                "settlement_status": SettlementStatus.NOT_SETTLED,
                "price_paid": hold.price_paid,
                "slot_price": hold.slot_price,
                "ball_price": hold.ball_price,
                "with_ball": hold.with_ball,
                "expires_at": None,
            }
        )
        payment = await self.payment_repo.create(
            {
                "booking_id": replacement.id,
                "amount": hold.price_paid,
                "gateway_transaction_id": result.transaction_id,
                "gateway_name": result.gateway_name,
                "card_number": result.card_number or None,
                "ref_id": result.ref_id or None,
                "gateway_fee": Decimal(str(result.fee)),
                "paid_at": result.paid_at,
                "status": PaymentStatus.SUCCESS,
            }
        )
        finance = FinanceService(self.db, self.current_user)
        await finance.create_refund(
            booking=original,
            refund_type=RefundType.REPLACED_AFTER_PENDING_CANCELLATION,
            reason="رزرو با پرداخت موفق متقاضی جایگزین منتقل شد",
            penalty_amount=request.penalty_amount,
            refund_amount=request.refund_amount,
            penalty_charged_to_user=True,
            site_bears_penalty=False,
        )
        await self.penalty_repo.create(
            user_id=original.user_id,
            booking_id=original.id,
            amount=request.penalty_amount,
            reason="Replacement booking completed",
        )
        await self.replacement_repo.update_request(
            request,
            {
                "status": ReplacementRequestStatus.COMPLETED,
                "replacement_booking_id": replacement.id,
                "completed_at": now,
            },
        )
        await self.replacement_repo.update_hold(
            hold,
            {
                "status": BookingHoldStatus.PAID,
                "processing_token": None,
                "replacement_booking_id": replacement.id,
                "gateway_transaction_id": result.transaction_id,
                "gateway_name": result.gateway_name,
                "card_number": result.card_number or None,
                "ref_id": result.ref_id or None,
                "gateway_fee": Decimal(str(result.fee)),
                "paid_at": result.paid_at,
                "failure_code": None,
            },
        )
        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVED})
        await invalidate_slot_list(slot.vendor_id)
        await self.notify_repo.create(
            user_id=original.user_id,
            type_="booking_replaced",
            message=f"برای سانس شما جایگزین پیدا شد و مبلغ {request.refund_amount} تومان در انتظار عودت است.",
        )
        await self.notify_repo.create(
            user_id=hold.user_id,
            type_="booking_confirmed",
            message=f"رزرو شما برای {vendor.name if vendor else 'مجموعه'} تأیید شد.",
        )
        if vendor:
            await self.notify_repo.create(
                user_id=vendor.manager_id,
                type_="booking_replaced",
                message=f"رزرو سانس {slot.start_time.strftime('%Y-%m-%d')} با موفقیت منتقل شد.",
            )
        await log_action(
            self.db,
            self.current_user.id,
            "replacement_booking_confirmed",
            f"انتقال رزرو کامل شد | رزرو {original.id} ← رزرو {replacement.id}",
        )
        await self.db.commit()
        replacement_booking = await self.booking_repo.get_by_id(replacement.id)
        if replacement_booking:
            await send_booking_confirmation_sms_for_booking(replacement_booking)
        detail = await self.get_booking(replacement.id)
        detail.payment = PaymentResponse.model_validate(payment)
        return detail

    async def _record_failed_zibal_attempt(self, track_id: str, message: str) -> None:
        """Persist a definitive failed callback after confirming it with inquiry."""
        gateway = ZibalGatewayService()
        try:
            inquiry = await gateway.inquiry_payment(track_id)
        except ZibalGatewayError:
            await self.db.rollback()
            return
        if inquiry.verified:
            await self.db.rollback()
            return
        if inquiry.payment_status in {None, -1, 2}:
            await self.db.rollback()
            return

        payment = await self.payment_repo.get_by_gateway_transaction_id(track_id, for_update=True)
        if payment:
            booking = await self.booking_repo.get_by_id(payment.booking_id, for_update=True)
            if not booking or booking.user_id != self.current_user.id:
                await self.db.rollback()
                return
            if payment.status == PaymentStatus.PENDING:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": PaymentStatus.FAILED,
                        "processing_token": None,
                        "failure_code": "zibal_payment_failed",
                    },
                )
            if booking.status == BookingStatus.PENDING_PAYMENT:
                slot = booking.slot
                await self.booking_repo.update(
                    booking,
                    {
                        "status": BookingStatus.CANCELLED,
                        "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                    },
                )
                if slot and slot.status == SlotStatus.RESERVING:
                    await self.slot_repo.update(
                        slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
                    await invalidate_slot_list(slot.vendor_id)
            await log_action(
                self.db,
                self.current_user.id,
                "payment_failed",
                f"پرداخت زیبال ناموفق بود | رزرو {payment.booking_id} — {message}",
                severity="WARNING",
            )
            await self.db.commit()
            return

        hold = await self.replacement_repo.get_hold_by_gateway_transaction_id(
            track_id, for_update=True
        )
        if not hold or hold.user_id != self.current_user.id:
            await self.db.rollback()
            return
        request = await self.replacement_repo.get_request(
            hold.replacement_request_id, for_update=True
        )
        if hold.status == BookingHoldStatus.PROCESSING:
            await self.replacement_repo.update_hold(
                hold,
                {
                    "status": BookingHoldStatus.FAILED,
                    "processing_token": None,
                    "failure_code": "zibal_payment_failed",
                },
            )
        if request and request.status == ReplacementRequestStatus.HELD:
            await self.replacement_repo.update_request(
                request, {"status": ReplacementRequestStatus.OPEN}
            )
            slot = hold.slot
            if slot and slot.status == SlotStatus.RESERVING:
                await self.slot_repo.update(
                    slot, {"is_reserved": True, "status": SlotStatus.PENDING_CANCELLATION}
                )
                await invalidate_slot_list(slot.vendor_id)
        await log_action(
            self.db,
            self.current_user.id,
            "replacement_payment_failed",
            f"پرداخت زیبال هولد {hold.id} ناموفق بود — {message}",
            severity="WARNING",
        )
        await self.db.commit()

    async def inquiry_zibal_payment(self, track_id: str) -> dict[str, object]:
        payment = await self.payment_repo.get_by_gateway_transaction_id(track_id)
        if not payment:
            hold = await self.replacement_repo.get_hold_by_gateway_transaction_id(track_id)
            if not hold:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="پرداخت یافت نشد")
            if hold.user_id != self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="شما به این هولد دسترسی ندارید",
                )
            gateway = ZibalGatewayService()
            try:
                result = await gateway.inquiry_payment(track_id)
            except ZibalVerificationError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
            return {
                "track_id": track_id,
                "payment_id": hold.id,
                "booking_id": hold.replacement_booking_id,
                "result": result.result,
                "verified": result.verified,
                "message": result.message,
                "payment_status": hold.status,
                "booking_status": None,
                "ref_id": result.ref_id,
            }
        booking = await self.booking_repo.get_by_id(payment.booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )

        gateway = ZibalGatewayService()
        try:
            result = await gateway.inquiry_payment(track_id)
        except ZibalVerificationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        return {
            "track_id": track_id,
            "payment_id": payment.id,
            "booking_id": booking.id,
            "result": result.result,
            "verified": result.verified,
            "message": result.message,
            "payment_status": payment.status,
            "booking_status": booking.status,
            "ref_id": result.ref_id,
        }

    async def pay_booking(self, booking_id: int) -> BookingDetailResponse:
        if settings.payment_gateway == "zibal":
            return await self._start_zibal_payment(booking_id)

        booking = await self.booking_repo.get_by_id(booking_id, for_update=True)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )
        if booking.status != BookingStatus.PENDING_PAYMENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="این رزرو در وضعیت پرداخت نیست"
            )

        slot = booking.slot  # loaded via selectinload
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if booking.expires_at and booking.expires_at < now_utc():
            is_replacement = booking.replaces_booking_id is not None
            await self.booking_repo.update(
                booking,
                {
                    "status": BookingStatus.EXPIRED,
                    "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                },
            )
            if slot and slot.status == SlotStatus.RESERVING:
                if is_replacement:
                    old_booking = await self.booking_repo.get_by_id(
                        booking.replaces_booking_id, for_update=True
                    )
                    if old_booking and old_booking.status == BookingStatus.PENDING_CANCELLATION:
                        await self.slot_repo.update(
                            slot,
                            {"is_reserved": True, "status": SlotStatus.PENDING_CANCELLATION},
                        )
                    else:
                        await self.slot_repo.update(
                            slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                        )
                else:
                    await self.slot_repo.update(
                        slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
            if slot:
                await invalidate_slot_list(slot.vendor_id)
            # Persist expiry before returning 409; otherwise get_db rolls the
            # transition back because the response is an HTTPException.
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="مهلت پرداخت این رزرو تمام شده است",
            )
        is_replacement = booking.replaces_booking_id is not None
        if slot.status in (SlotStatus.CLOSED, SlotStatus.BLOCKED, SlotStatus.DISABLED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس بسته شده است"
            )
        if slot.is_reserved and not is_replacement:
            active = await self.booking_repo.get_active_by_slot(slot.id, for_update=True)
            if slot.status == SlotStatus.RESERVING and active and active.id == booking.id:
                pass
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="این سانس قبلاً رزرو شده است",
                )
        if is_replacement and slot.status != SlotStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این سانس دیگر در وضعیت جایگزینی نیست",
            )
        vendor = slot.vendor

        latest_payment = await self.payment_repo.get_by_booking(booking_id)
        if latest_payment and latest_payment.status == PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="نتیجه پرداخت قبلی هنوز مشخص نشده است؛ برای جلوگیری از برداشت تکراری دوباره پرداخت نکنید",
            )

        # Persist a unique processing attempt and release database locks before
        # calling the external gateway. A timeout remains pending for manual or
        # provider-driven reconciliation and cannot be charged a second time.
        processing_token = uuid4().hex
        payment = await self.payment_repo.create(
            {
                "booking_id": booking_id,
                "amount": booking.price_paid,
                "status": "pending",
                "idempotency_key": f"booking:{booking_id}:{processing_token}",
                "processing_token": processing_token,
            }
        )
        payment_id = payment.id
        await self.db.commit()

        payment_service = PaymentService()
        try:
            result = await payment_service.process_payment(float(booking.price_paid))
        except InsufficientFundsError:
            payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": "failed",
                        "processing_token": None,
                        "failure_code": "insufficient_funds",
                    },
                )
                await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="موجودی حساب کافی نیست. لطفاً از کارت دیگری استفاده کنید.",
            )
        except GatewayTimeoutError:
            payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment, {"failure_code": "gateway_timeout_uncertain"}
                )
                await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="وضعیت پرداخت از درگاه مشخص نیست؛ برای جلوگیری از برداشت تکراری دوباره پرداخت نکنید",
            )
        except FraudDetectionError:
            payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": "failed",
                        "processing_token": None,
                        "failure_code": "fraud_detected",
                    },
                )
                await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تراکنش توسط سیستم امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.",
            )
        except PaymentError as exc:
            payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment,
                    {"status": "failed", "processing_token": None, "failure_code": exc.code},
                )
                await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.",
            )

        booking = await self.booking_repo.get_by_id(booking_id, for_update=True)
        payment = await self.payment_repo.get_by_id(payment_id, for_update=True)
        if (
            not booking
            or not payment
            or payment.processing_token != processing_token
            or booking.status != BookingStatus.PENDING_PAYMENT
        ):
            if payment and payment.processing_token == processing_token:
                await self.payment_repo.update(
                    payment,
                    {
                        "status": "success",
                        "processing_token": None,
                        "failure_code": "paid_but_booking_conflicted",
                        "gateway_transaction_id": result.transaction_id,
                        "gateway_name": result.gateway_name,
                        "card_number": result.card_number,
                        "ref_id": result.ref_id,
                        "gateway_fee": result.fee,
                        "paid_at": result.paid_at,
                    },
                )
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پرداخت ثبت شد اما نهایی‌سازی رزرو نیازمند بررسی پشتیبانی است",
            )
        slot = booking.slot
        vendor = slot.vendor if slot else None
        payment = await self.payment_repo.update(
            payment,
            {
                "gateway_transaction_id": result.transaction_id,
                "gateway_name": result.gateway_name,
                "card_number": result.card_number,
                "ref_id": result.ref_id,
                "gateway_fee": result.fee,
                "paid_at": result.paid_at,
                "status": "success",
                "processing_token": None,
                "failure_code": None,
            },
        )

        if is_replacement:
            old_booking = await self.booking_repo.get_by_id(
                booking.replaces_booking_id, for_update=True
            )
            if old_booking and old_booking.status == BookingStatus.PENDING_CANCELLATION:
                penalty_amount = Decimal(str(old_booking.price_paid)) * Decimal("0.10")
                refund_amount = Decimal(str(old_booking.price_paid)) - penalty_amount
                finance = FinanceService(self.booking_repo.db, self.current_user)
                await finance.create_refund(
                    booking=old_booking,
                    refund_type=RefundType.REPLACED_AFTER_PENDING_CANCELLATION,
                    reason="جایگزینی رزرو در وضعیت انتظار لغو",
                    penalty_amount=penalty_amount,
                    refund_amount=refund_amount,
                    penalty_charged_to_user=True,
                    site_bears_penalty=False,
                )
                await self.booking_repo.update(
                    old_booking,
                    {
                        "status": BookingStatus.TRANSFERRED,
                        "penalty_amount": penalty_amount,
                        "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_REFUND,
                    },
                )
                await self.penalty_repo.create(
                    user_id=old_booking.user_id,
                    booking_id=old_booking.id,
                    amount=penalty_amount,
                    reason="Replacement booking during pending cancellation",
                )

        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVED})
        await invalidate_slot_list(slot.vendor_id)

        # Update booking status
        booking = await self.booking_repo.update(
            booking, {"status": BookingStatus.CONFIRMED, "expires_at": None}
        )

        # Notify user about confirmed booking
        await self.notify_repo.create(
            user_id=self.current_user.id,
            type_="booking_confirmed",
            message=f"رزرو شما برای {vendor.name if vendor else 'زمین'} تایید شد",
        )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "booking_confirmed",
            f"تایید رزرو | رزرو {booking_id} به مبلغ {booking.price_paid} تومان پرداخت و تایید شد",
        )
        await send_booking_confirmation_sms_for_booking(booking)

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
            ball_price=float(booking.ball_price or 0),
            with_ball=booking.with_ball,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment),
        )

    async def get_replacement_hold(self, hold_id: int) -> ReplacementHoldResponse:
        hold = await self.replacement_repo.get_hold(hold_id)
        if not hold:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="هولد یافت نشد")
        if hold.user_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این هولد دسترسی ندارید"
            )
        return self._hold_response(hold)

    async def cancel_replacement_hold(self, hold_id: int) -> ReplacementHoldResponse:
        hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
        if not hold:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="هولد یافت نشد")
        if hold.user_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این هولد دسترسی ندارید"
            )
        if hold.status == BookingHoldStatus.PROCESSING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پرداخت این هولد در حال پردازش است و فعلاً قابل لغو نیست",
            )
        if hold.status != BookingHoldStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این هولد دیگر فعال نیست"
            )
        request = await self.replacement_repo.get_request(
            hold.replacement_request_id, for_update=True
        )
        await self.replacement_repo.update_hold(
            hold,
            {"status": BookingHoldStatus.CANCELLED, "failure_code": "cancelled_by_user"},
        )
        if request and request.status == ReplacementRequestStatus.HELD:
            await self.replacement_repo.update_request(
                request, {"status": ReplacementRequestStatus.OPEN}
            )
            if hold.slot.status == SlotStatus.RESERVING:
                await self.slot_repo.update(
                    hold.slot,
                    {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
                )
                await invalidate_slot_list(hold.slot.vendor_id)
        await log_action(
            self.db,
            self.current_user.id,
            "replacement_hold_cancelled",
            f"هولد جایگزینی لغو شد | هولد {hold.id}",
        )
        loaded_hold = await self.replacement_repo.get_hold(hold.id)
        assert loaded_hold is not None
        return self._hold_response(loaded_hold)

    async def _fail_replacement_payment(
        self,
        hold_id: int,
        processing_token: str,
        *,
        failure_code: str,
        failure_message: str,
        uncertain: bool = False,
    ) -> None:
        hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
        if not hold or hold.processing_token != processing_token:
            await self.db.rollback()
            return
        request = await self.replacement_repo.get_request(
            hold.replacement_request_id, for_update=True
        )
        if uncertain:
            await self.replacement_repo.update_hold(hold, {"failure_code": failure_code})
        else:
            await self.replacement_repo.update_hold(
                hold,
                {
                    "status": BookingHoldStatus.FAILED,
                    "processing_token": None,
                    "failure_code": failure_code,
                },
            )
            if request and request.deadline > now_utc():
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.OPEN}
                )
                if hold.slot.status == SlotStatus.RESERVING:
                    await self.slot_repo.update(
                        hold.slot,
                        {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
                    )
                    await invalidate_slot_list(hold.slot.vendor_id)
            elif request:
                original = await self.booking_repo.get_by_id(
                    request.original_booking_id, for_update=True
                )
                slot = await self.slot_repo.get_by_id(request.slot_id, for_update=True)
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.EXPIRED}
                )
                if original and original.status == BookingStatus.PENDING_CANCELLATION:
                    await self.booking_repo.update(
                        original, {"status": BookingStatus.CONFIRMED, "penalty_amount": None}
                    )
                if slot and slot.status in (
                    SlotStatus.PENDING_CANCELLATION,
                    SlotStatus.RESERVING,
                ):
                    await self.slot_repo.update(
                        slot, {"status": SlotStatus.RESERVED, "is_reserved": True}
                    )
                    await invalidate_slot_list(slot.vendor_id)
        await self.notify_repo.create(
            user_id=self.current_user.id,
            type_="replacement_payment_failed",
            message=f"پرداخت سانس جایگزین ناموفق بود: {failure_message}",
        )
        await log_action(
            self.db,
            self.current_user.id,
            "replacement_payment_failed",
            f"پرداخت هولد {hold_id} ناموفق بود — {failure_code}",
            severity="WARNING",
        )
        # Persist the gateway outcome before returning an HTTP error. The request
        # dependency rolls back uncommitted work whenever HTTPException is raised.
        await self.db.commit()

    async def pay_replacement_hold(
        self, hold_id: int
    ) -> BookingDetailResponse | PaymentStartResponse:
        hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
        if not hold:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="هولد یافت نشد")
        if hold.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این هولد دسترسی ندارید"
            )
        if hold.status == BookingHoldStatus.PAID and hold.replacement_booking_id:
            return await self.get_booking(hold.replacement_booking_id)
        if hold.status == BookingHoldStatus.PROCESSING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پرداخت این هولد در حال پردازش است",
            )
        if hold.status != BookingHoldStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این هولد دیگر قابل پرداخت نیست"
            )

        request = await self.replacement_repo.get_request(
            hold.replacement_request_id, for_update=True
        )
        now = now_utc()
        if (
            request is None
            or request.status != ReplacementRequestStatus.HELD
            or hold.expires_at <= now
            or request.deadline <= now
        ):
            await self.replacement_repo.update_hold(
                hold,
                {
                    "status": BookingHoldStatus.EXPIRED,
                    "processing_token": None,
                    "failure_code": "hold_expired",
                },
            )
            if request and request.deadline > now:
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.OPEN}
                )
                if hold.slot.status == SlotStatus.RESERVING:
                    await self.slot_repo.update(
                        hold.slot,
                        {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
                    )
                    await invalidate_slot_list(hold.slot.vendor_id)
            elif request:
                original = await self.booking_repo.get_by_id(
                    request.original_booking_id, for_update=True
                )
                slot = await self.slot_repo.get_by_id(request.slot_id, for_update=True)
                await self.replacement_repo.update_request(
                    request, {"status": ReplacementRequestStatus.EXPIRED}
                )
                if original and original.status == BookingStatus.PENDING_CANCELLATION:
                    await self.booking_repo.update(
                        original, {"status": BookingStatus.CONFIRMED, "penalty_amount": None}
                    )
                if slot and slot.status in (
                    SlotStatus.PENDING_CANCELLATION,
                    SlotStatus.RESERVING,
                ):
                    await self.slot_repo.update(
                        slot, {"status": SlotStatus.RESERVED, "is_reserved": True}
                    )
                    await invalidate_slot_list(slot.vendor_id)
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="مهلت پرداخت این هولد تمام شده است"
            )

        processing_token = uuid4().hex
        payment_amount = Decimal(str(hold.price_paid))
        await self.replacement_repo.update_hold(
            hold,
            {
                "status": BookingHoldStatus.PROCESSING,
                "processing_token": processing_token,
                "processing_started_at": now,
                "failure_code": None,
            },
        )
        # Release row locks before the external gateway call. PROCESSING plus the
        # partial unique index keeps all other buyers out during this interval.
        await self.db.commit()

        if settings.payment_gateway == "zibal":
            # Zibal flow for replacement holds: start payment and return redirect URL.
            # The hold stays in PROCESSING state; verify is handled via /payments/zibal/verify
            # after the user returns from the bank page.
            gateway = ZibalGatewayService()
            try:
                zibal_result = await gateway.request_payment(
                    amount=payment_amount,
                    callback_url=settings.zibal_callback_url,
                    order_id=f"hold:{hold_id}",
                    mobile=self.current_user.phone if self.current_user else None,
                )
            except ZibalGatewayError as exc:
                await self._fail_replacement_payment(
                    hold_id,
                    processing_token,
                    failure_code=exc.code,
                    failure_message=str(exc),
                )
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

            # Record the track_id on the hold so verify can look it up later
            hold = await self.replacement_repo.get_hold(hold_id, for_update=True)
            if hold and hold.processing_token == processing_token:
                await self.replacement_repo.update_hold(
                    hold,
                    {
                        "gateway_transaction_id": zibal_result.track_id,
                        "gateway_name": "zibal",
                        "failure_code": None,
                    },
                )
                await self.db.commit()
            await log_action(
                self.db,
                self.current_user.id,
                "replacement_payment_started",
                f"شروع پرداخت زیبال برای هولد {hold_id} — trackId {zibal_result.track_id}",
            )
            return PaymentStartResponse(
                checkout_type="replacement_hold",
                payment_gateway="zibal",
                booking_id=hold_id,
                payment_id=hold_id,
                amount=float(payment_amount),
                track_id=zibal_result.track_id,
                start_url=zibal_result.start_url,
                callback_url=zibal_result.callback_url,
                expires_at=hold.expires_at if hold else None,
            )

        # ── Mock gateway (development only) ──────────────────────────
        payment_service = PaymentService()
        try:
            result = await payment_service.process_payment(float(payment_amount))
        except GatewayTimeoutError as exc:
            await self._fail_replacement_payment(
                hold_id,
                processing_token,
                failure_code=exc.code,
                failure_message=str(exc),
                uncertain=True,
            )
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="وضعیت پرداخت از درگاه مشخص نیست؛ تا تعیین تکلیف دوباره پرداخت نکنید.",
            )
        except PaymentError as exc:
            await self._fail_replacement_payment(
                hold_id,
                processing_token,
                failure_code=exc.code,
                failure_message=str(exc),
            )
            status_code = (
                status.HTTP_400_BAD_REQUEST
                if isinstance(exc, (InsufficientFundsError, FraudDetectionError))
                else status.HTTP_400_BAD_REQUEST
            )
            raise HTTPException(status_code=status_code, detail=str(exc))

        return await self._finalize_replacement_payment(hold_id, processing_token, result)

    async def cancel_booking(
        self, data: BookingCancelRequest, booking_id: int
    ) -> BookingDetailResponse:
        booking = await self._get_owned_booking_for_cancel(booking_id, for_update=True)
        if booking.status in (BookingStatus.CANCELLED, BookingStatus.TRANSFERRED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این رزرو قبلاً لغو شده است"
            )
        if booking.status == BookingStatus.EXPIRED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="رزرو منقضی‌شده قابل لغو یا بازپرداخت نیست",
            )
        if booking.status == BookingStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این رزرو قبلاً در انتظار جایگزین قرار گرفته است",
            )

        slot = booking.slot  # loaded via selectinload
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        vendor = slot.vendor

        was_confirmed = booking.status == BookingStatus.CONFIRMED
        if slot.start_time <= now_utc():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="زمان این سانس گذشته یا شروع شده و دیگر قابل لغو نیست",
            )

        if booking.status == BookingStatus.PENDING_PAYMENT:
            payment = await self.payment_repo.get_by_booking(booking_id)
            if (
                payment
                and payment.status == PaymentStatus.PENDING
                and payment.gateway_transaction_id
            ):
                track_id = payment.gateway_transaction_id
                await self.db.commit()
                resolution = await self.resolve_zibal_payment(track_id)
                if resolution.outcome == "failed":
                    return await self.get_booking(booking_id)
                if resolution.outcome == "paid":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="پرداخت این رزرو موفق شده و لغو آن تابع قوانین بازپرداخت است",
                    )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="نتیجه پرداخت درگاه هنوز قطعی نیست؛ تراکنش به صورت خودکار بررسی می‌شود",
                )
            if payment and payment.status == PaymentStatus.PENDING and payment.processing_token:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="درخواست پرداخت هنوز در حال ایجاد است؛ چند لحظه دیگر دوباره تلاش کنید",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "رزرو در انتظار پرداخت از داخل سایت قابل لغو نیست؛ وارد درگاه شوید "
                    "و گزینه لغو پرداخت را انتخاب کنید"
                ),
            )
            replaces_booking_id = booking.replaces_booking_id
            booking = await self.booking_repo.update(
                booking,
                {
                    "status": BookingStatus.CANCELLED,
                    "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                },
            )
            if slot.status == SlotStatus.RESERVING:
                if replaces_booking_id:
                    old_booking = await self.booking_repo.get_by_id(
                        replaces_booking_id, for_update=True
                    )
                    if old_booking and old_booking.status == BookingStatus.PENDING_CANCELLATION:
                        await self.slot_repo.update(
                            slot,
                            {"is_reserved": True, "status": SlotStatus.PENDING_CANCELLATION},
                        )
                    else:
                        await self.slot_repo.update(
                            slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                        )
                else:
                    await self.slot_repo.update(
                        slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                    )
            await invalidate_slot_list(slot.vendor_id)
            return BookingDetailResponse(
                id=booking.id,
                user_id=booking.user_id,
                slot_id=booking.slot_id,
                status=booking.status,
                price_paid=float(booking.price_paid),
                slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
                ball_price=float(booking.ball_price or 0),
                with_ball=booking.with_ball,
                penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
                created_at=booking.created_at,
                updated_at=booking.updated_at,
                expires_at=booking.expires_at,
                vendor_name=vendor.name if vendor else "",
                vendor_address=vendor.address if vendor else "",
                slot_start_time=slot.start_time if slot else None,
                slot_end_time=slot.end_time if slot else None,
                payment=PaymentResponse.model_validate(payment) if payment else None,
            )

        now = now_utc()
        time_until_slot = slot.start_time - now
        actual_mode = (
            "pending_replacement"
            if time_until_slot <= timedelta(hours=48)
            else "refund_with_penalty"
        )
        if data.expected_mode and data.expected_mode != actual_mode:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "cancellation_terms_changed",
                    "message": "شرایط لغو به دلیل نزدیک‌شدن زمان سانس تغییر کرده است؛ لطفاً دوباره بررسی کنید",
                },
            )

        if not data.accepted_terms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="برای لغو رزرو باید شروط لغو را مطالعه و تأیید کنید",
            )

        await self._ensure_verified_bank_card(data.card_number)

        if time_until_slot <= timedelta(hours=48):
            penalty_amount = Decimal(str(booking.price_paid)) * Decimal("0.10")
            refund_amount = Decimal(str(booking.price_paid)) - penalty_amount
            booking = await self.booking_repo.update(
                booking,
                {
                    "status": BookingStatus.PENDING_CANCELLATION,
                    "penalty_amount": None,
                },
            )
            await self.slot_repo.update(
                slot,
                {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
            )
            await invalidate_slot_list(slot.vendor_id)
            await self.replacement_repo.create_request(
                {
                    "original_booking_id": booking.id,
                    "slot_id": slot.id,
                    "status": ReplacementRequestStatus.OPEN,
                    "penalty_amount": penalty_amount,
                    "refund_amount": refund_amount,
                    "deadline": slot.start_time,
                }
            )
            payment = await self.payment_repo.get_by_booking(booking_id)
            return BookingDetailResponse(
                id=booking.id,
                user_id=booking.user_id,
                slot_id=booking.slot_id,
                status=booking.status,
                price_paid=float(booking.price_paid),
                slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
                ball_price=float(booking.ball_price or 0),
                with_ball=booking.with_ball,
                penalty_amount=None,
                created_at=booking.created_at,
                updated_at=booking.updated_at,
                expires_at=booking.expires_at,
                vendor_name=vendor.name if vendor else "",
                vendor_address=vendor.address if vendor else "",
                slot_start_time=slot.start_time if slot else None,
                slot_end_time=slot.end_time if slot else None,
                payment=PaymentResponse.model_validate(payment) if payment else None,
            )

        penalty_amount = Decimal(str(booking.price_paid)) * Decimal("0.10")
        refund_amount = Decimal(str(booking.price_paid)) - penalty_amount
        update_data: dict = {
            "status": BookingStatus.CANCELLED,
            "penalty_amount": penalty_amount,
            "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_REFUND,
        }
        await self.penalty_repo.create(
            user_id=self.current_user.id,
            booking_id=booking_id,
            amount=penalty_amount,
            reason="Cancellation more than 48 hours before session start",
        )
        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "penalty_created",
            f"جریمه لغو رزرو | رزرو {booking_id} — مبلغ {penalty_amount} تومان (۱۰٪)",
        )

        booking = await self.booking_repo.update(booking, update_data)

        # Free the slot if it was confirmed
        if was_confirmed:
            await self.slot_repo.update(slot, {"is_reserved": False, "status": SlotStatus.OPEN})
            await invalidate_slot_list(slot.vendor_id)

        finance = FinanceService(self.booking_repo.db, self.current_user)
        await finance.create_refund(
            booking=booking,
            refund_type=RefundType.USER_CANCELLATION,
            reason="لغو کاربر بیشتر از ۴۸ ساعت مانده به شروع سانس",
            penalty_amount=penalty_amount,
            refund_amount=refund_amount,
            penalty_charged_to_user=True,
            site_bears_penalty=False,
        )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "refund_created",
            f"رکورد عودت ساخته شد | رزرو {booking_id} — مبلغ {refund_amount} تومان",
        )

        # Notify manager about cancellation
        if vendor:
            await self.notify_repo.create(
                user_id=vendor.manager_id,
                type_="booking_cancelled",
                message=f"رزرو {vendor.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')} لغو شد",
            )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "booking_cancelled",
            f"لغو رزرو | رزرو {booking_id} لغو شد — {refund_amount} تومان در انتظار عودت است (جریمه: {penalty_amount} تومان)",
        )

        payment = await self.payment_repo.get_by_booking(booking_id)
        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
            ball_price=float(booking.ball_price or 0),
            with_ball=booking.with_ball,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment) if payment else None,
        )

    async def withdraw_cancellation(self, booking_id: int) -> BookingDetailResponse:
        """Return a pending-cancellation booking to its original owner."""
        booking = await self._get_owned_booking_for_cancel(booking_id)
        if booking.status != BookingStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این رزرو در وضعیت انتظار برای لغو نیست",
            )
        slot = booking.slot
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.start_time <= now_utc():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="پس از شروع سانس امکان انصراف از لغو وجود ندارد",
            )

        # The slot row serializes this transition with a new replacement hold.
        slot = await self.slot_repo.get_by_id(slot.id, for_update=True)
        booking = await self._get_owned_booking_for_cancel(booking_id, for_update=True)
        if booking.status != BookingStatus.PENDING_CANCELLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="وضعیت رزرو تغییر کرده است؛ لطفاً صفحه را به‌روز کنید",
            )
        request = await self.replacement_repo.get_request_by_original(booking.id, for_update=True)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="درخواست جایگزینی این رزرو یافت نشد",
            )
        if request.status == ReplacementRequestStatus.HELD:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="کاربر جایگزین در حال تکمیل رزرو است؛ فعلاً امکان انصراف وجود ندارد",
            )
        if request.status != ReplacementRequestStatus.OPEN:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="درخواست جایگزینی دیگر قابل پس‌گرفتن نیست",
            )

        await self.replacement_repo.update_request(
            request, {"status": ReplacementRequestStatus.REVOKED}
        )
        await self.booking_repo.update(
            booking, {"status": BookingStatus.CONFIRMED, "penalty_amount": None}
        )
        if slot:
            await self.slot_repo.update(slot, {"status": SlotStatus.RESERVED, "is_reserved": True})
            await invalidate_slot_list(slot.vendor_id)
        await self.notify_repo.create(
            user_id=booking.user_id,
            type_="cancellation_withdrawn",
            message="درخواست لغو پس گرفته شد و سانس دوباره برای شما قطعی است.",
        )
        await log_action(
            self.db,
            self.current_user.id,
            "booking_cancellation_withdrawn",
            f"انصراف از لغو رزرو | رزرو {booking.id}",
        )
        return await self.get_booking(booking.id)

    async def list_all_bookings(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> AdminBookingListResponse:
        bookings, total = await self.booking_repo.list_all(
            after_id=after_id, skip=skip, limit=limit, search=search, status_filter=status_filter
        )
        result = []
        for b in bookings:
            slot = b.slot  # loaded via selectinload
            vendor = slot.vendor if slot else None
            user = b.user  # relationship loaded
            result.append(
                AdminBookingResponse(
                    id=b.id,
                    user_id=b.user_id,
                    slot_id=b.slot_id,
                    status=b.status.value if hasattr(b.status, "value") else b.status,
                    price_paid=float(b.price_paid),
                    slot_price=float(b.slot_price) if b.slot_price is not None else None,
                    ball_price=float(b.ball_price or 0),
                    with_ball=b.with_ball,
                    penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    expires_at=b.expires_at,
                    vendor_name=vendor.name if vendor else "",
                    vendor_address=vendor.address if vendor else "",
                    user_name=user.full_name if user else "",
                    user_phone=user.phone if user else "",
                    slot_start_time=slot.start_time if slot else None,
                    slot_end_time=slot.end_time if slot else None,
                )
            )
        next_cursor = None
        if bookings and len(bookings) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(bookings[-1].id)
        return AdminBookingListResponse(bookings=result, total=total, next_cursor=next_cursor)


async def get_booking_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingService:
    return BookingService(db=db, current_user=current_user)


async def reconcile_stale_zibal_payments(
    db: AsyncSession, *, older_than: timedelta = timedelta(minutes=2)
) -> dict[str, int]:
    """Reconcile callbacks that never reached the browser or backend."""
    cutoff = now_utc() - older_than
    payment_repo = PaymentRepo(db)
    replacement_repo = ReplacementRepo(db)
    booking_repo = BookingRepo(db)

    cleaned = await payment_repo.expire_pending_for_nonpayable_bookings()
    if cleaned:
        await db.commit()

    payments = await payment_repo.list_stale_zibal_pending(cutoff)
    holds = await replacement_repo.list_stale_zibal_processing(cutoff)
    targets: list[tuple[str, int]] = []
    for payment in payments:
        booking = await booking_repo.get_by_id(payment.booking_id)
        if booking and payment.gateway_transaction_id:
            targets.append((payment.gateway_transaction_id, booking.user_id))
    for hold in holds:
        if hold.gateway_transaction_id:
            targets.append((hold.gateway_transaction_id, hold.user_id))

    counts = {
        "paid": 0,
        "failed": 0,
        "pending": 0,
        "reconciliation_required": 0,
        "cleaned": cleaned,
    }
    for track_id, user_id in targets:
        user = await db.get(User, user_id)
        if not user:
            counts["reconciliation_required"] += 1
            continue
        try:
            result = await BookingService(db, user).resolve_zibal_payment(track_id)
        except Exception:
            await db.rollback()
            counts["reconciliation_required"] += 1
            continue
        counts[result.outcome] += 1
    if counts["paid"] or counts["failed"]:
        from app.services.cache_service import invalidate_admin_list_cache

        await invalidate_admin_list_cache("bookings")
        await invalidate_admin_list_cache("payments")
    return counts
