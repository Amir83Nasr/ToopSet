from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import log_action
from app.core.timezone import now_utc
from app.models.booking import BookingSource, BookingStatus, SettlementStatus
from app.models.refund import Refund, RefundType
from app.models.time_slot import SlotStatus
from app.models.user import User
from app.repositories.bank_card_repo import BankCardRepo
from app.repositories.booking_repo import BookingRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.penalty_repo import PenaltyRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.wallet_repo import WalletRepo
from app.schemas.booking import (
    AdminBookingListResponse,
    AdminBookingResponse,
    BookingCancellationTermsResponse,
    BookingCancelRequest,
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
    PaymentResponse,
)
from app.services.bank_card_service import BankCardService
from app.services.finance_service import FinanceService
from app.services.payment_service import (
    FraudDetectionError,
    GatewayTimeoutError,
    InsufficientFundsError,
    PaymentError,
    PaymentService,
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
        self.current_user = current_user

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

    async def get_cancellation_terms(self, booking_id: int) -> BookingCancellationTermsResponse:
        booking = await self._get_owned_booking_for_cancel(booking_id)
        slot = booking.slot
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")

        rules = [
            "لغو فقط برای رزروهای پرداخت‌نشده یا تأییدشده امکان‌پذیر است.",
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
                can_cancel=True,
                requires_bank_card=False,
                has_verified_bank_card=bool(await self._get_verified_bank_card(booking.user_id)),
                mode="pending_payment",
                refund_amount=0,
                penalty_amount=0,
                rules=rules,
            )

        has_card = bool(await self._get_verified_bank_card(booking.user_id))
        time_until_slot = slot.start_time - now_utc()
        if time_until_slot <= timedelta(hours=48):
            return BookingCancellationTermsResponse(
                booking_id=booking.id,
                can_cancel=True,
                requires_bank_card=True,
                has_verified_bank_card=has_card,
                mode="pending_replacement",
                refund_amount=0,
                penalty_amount=0,
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
                    participants_count=b.participants_count,
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
                    refund_paid_at=refund.paid_at if refund else None,
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
    ) -> BookingListResponse:
        bookings, total = await self.booking_repo.list_by_user(
            self.current_user.id,
            after_id=after_id,
            skip=skip,
            limit=limit,
            status_filter=status_filter,
        )
        next_cursor = None
        if bookings and len(bookings) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(bookings[-1].id)
        result = await self._build_booking_detail_list(bookings)
        return BookingListResponse(bookings=result, total=total, next_cursor=next_cursor)

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
            participants_count=booking.participants_count,
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
            refund_paid_at=refund.paid_at if refund else None,
        )

    async def create_booking(self, data: BookingCreate) -> BookingDetailResponse:
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
        if data.with_ball and not slot.ball_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="امکان رزرو توپ برای این سانس وجود ندارد",
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

        if data.participants_count > vendor.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تعداد شرکت‌کنندگان بیش از ظرفیت مجموعه است",
            )

        existing = await self.booking_repo.get_active_by_slot(data.slot_id, for_update=True)
        replaces_booking_id = None
        if existing and existing.status == BookingStatus.PENDING_CANCELLATION:
            if existing.user_id == self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="رزرو قبلی شما برای این سانس در انتظار جایگزین است",
                )
            replaces_booking_id = existing.id
        elif existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس قبلاً رزرو شده است"
            )

        slot_price = Decimal(str(slot.base_price))
        ball_price = Decimal(str(slot.ball_price or 0)) if data.with_ball else Decimal("0")
        final_price = slot_price + ball_price

        booking = await self.booking_repo.create(
            {
                "user_id": self.current_user.id,
                "slot_id": data.slot_id,
                "replaces_booking_id": replaces_booking_id,
                "status": BookingStatus.PENDING_PAYMENT,
                "source": BookingSource.ONLINE,
                "settlement_status": SettlementStatus.NOT_SETTLED,
                "price_paid": final_price,
                "slot_price": slot_price,
                "ball_price": ball_price,
                "with_ball": data.with_ball,
                "participants_count": data.participants_count,
                "expires_at": now_utc() + timedelta(minutes=10),
            }
        )
        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVING})

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
            participants_count=booking.participants_count,
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

    async def pay_booking(self, booking_id: int) -> BookingDetailResponse:
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

        # Process mock payment
        payment_service = PaymentService()
        try:
            result = await payment_service.process_payment(float(booking.price_paid))
        except InsufficientFundsError:
            await self._record_failed_payment(
                booking_id, float(booking.price_paid), "موجودی ناکافی"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="موجودی حساب کافی نیست. لطفاً از کارت دیگری استفاده کنید.",
            )
        except GatewayTimeoutError:
            await self._record_failed_payment(
                booking_id, float(booking.price_paid), "خطای درگاه پرداخت"
            )
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="درگاه پرداخت پاسخگو نیست. لطفاً مجدداً تلاش کنید.",
            )
        except FraudDetectionError:
            await self._record_failed_payment(
                booking_id, float(booking.price_paid), "مسدود شدن توسط سیستم امنیتی"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تراکنش توسط سیستم امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.",
            )
        except PaymentError:
            # Generic / unknown failure
            await self._record_failed_payment(
                booking_id, float(booking.price_paid), "خطای ناشناخته"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.",
            )

        payment = await self.payment_repo.create(
            {
                "booking_id": booking_id,
                "amount": float(booking.price_paid),
                "gateway_transaction_id": result.transaction_id,
                "gateway_name": result.gateway_name,
                "card_number": result.card_number,
                "ref_id": result.ref_id,
                "gateway_fee": result.fee,
                "paid_at": result.paid_at,
                "status": "success",
            }
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

        # Update booking status
        booking = await self.booking_repo.update(booking, {"status": BookingStatus.CONFIRMED})

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

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            slot_price=float(booking.slot_price) if booking.slot_price is not None else None,
            ball_price=float(booking.ball_price or 0),
            with_ball=booking.with_ball,
            participants_count=booking.participants_count,
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

    async def cancel_booking(
        self, data: BookingCancelRequest, booking_id: int
    ) -> BookingDetailResponse:
        booking = await self._get_owned_booking_for_cancel(booking_id, for_update=True)
        if booking.status in (BookingStatus.CANCELLED, BookingStatus.TRANSFERRED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این رزرو قبلاً لغو شده است"
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
                participants_count=booking.participants_count,
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

        if not data.accepted_terms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="برای لغو رزرو باید شروط لغو را مطالعه و تأیید کنید",
            )

        await self._ensure_verified_bank_card(data.card_number)

        if time_until_slot <= timedelta(hours=48):
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
                participants_count=booking.participants_count,
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

        penalty_amount = float(booking.price_paid) * 0.1
        refund_amount = float(booking.price_paid) - penalty_amount
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

        finance = FinanceService(self.booking_repo.db, self.current_user)
        await finance.create_refund(
            booking=booking,
            refund_type=RefundType.USER_CANCELLATION,
            reason="لغو کاربر بیشتر از ۴۸ ساعت مانده به شروع سانس",
            penalty_amount=Decimal(str(penalty_amount)),
            refund_amount=Decimal(str(refund_amount)),
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
            f"لغو رزرو | رزرو {booking_id} لغو شد — {refund_amount} تومان به کیف پول بازگشت (جریمه: {penalty_amount} تومان)",
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
            participants_count=booking.participants_count,
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
                    participants_count=b.participants_count,
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
