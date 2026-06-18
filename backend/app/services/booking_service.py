from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import log_action
from app.core.timezone import now_utc
from app.models.booking import BookingStatus
from app.models.user import User
from app.repositories.booking_repo import BookingRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.penalty_repo import PenaltyRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.wallet_repo import WalletRepo
from app.schemas.booking import (
    AdminBookingListResponse,
    AdminBookingResponse,
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
    PaymentResponse,
)
from app.services.payment_service import (
    FraudDetectionError,
    GatewayTimeoutError,
    InsufficientFundsError,
    PaymentError,
    PaymentService,
)


class BookingService:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.booking_repo = BookingRepo(db)
        self.slot_repo = TimeSlotRepo(db)
        self.payment_repo = PaymentRepo(db)
        self.notify_repo = NotificationRepo(db)
        self.penalty_repo = PenaltyRepo(db)
        self.wallet_repo = WalletRepo(db)
        self.current_user = current_user

    async def list_my_bookings(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
    ) -> BookingListResponse:
        bookings, total = await self.booking_repo.list_by_user(
            self.current_user.id, skip=skip, limit=limit, status_filter=status_filter
        )
        result = []
        for b in bookings:
            slot = await self.slot_repo.get_by_id(b.slot_id)
            court = slot.court if slot else None
            result.append(
                BookingDetailResponse(
                    id=b.id,
                    user_id=b.user_id,
                    slot_id=b.slot_id,
                    status=b.status,
                    price_paid=float(b.price_paid),
                    participants_count=b.participants_count,
                    penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    expires_at=b.expires_at,
                    court_name=court.name if court else "",
                    court_address=court.address if court else "",
                    slot_start_time=slot.start_time if slot else None,
                    slot_end_time=slot.end_time if slot else None,
                    payment=None,
                )
            )
        return BookingListResponse(bookings=result, total=total)

    async def list_completed_bookings(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> BookingListResponse:
        bookings, total = await self.booking_repo.list_completed_by_user(
            self.current_user.id, skip=skip, limit=limit
        )
        result = []
        for b in bookings:
            slot = await self.slot_repo.get_by_id(b.slot_id)
            court = slot.court if slot else None
            result.append(
                BookingDetailResponse(
                    id=b.id,
                    user_id=b.user_id,
                    slot_id=b.slot_id,
                    status=b.status,
                    price_paid=float(b.price_paid),
                    participants_count=b.participants_count,
                    penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    expires_at=b.expires_at,
                    court_name=court.name if court else "",
                    court_address=court.address if court else "",
                    slot_start_time=slot.start_time if slot else None,
                    slot_end_time=slot.end_time if slot else None,
                    payment=None,
                )
            )
        return BookingListResponse(bookings=result, total=total)

    async def get_booking(self, booking_id: int) -> BookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        court = slot.court if slot else None
        payment = await self.payment_repo.get_by_booking(booking_id)
        # Notify manager about new booking
        if court:
            await self.notify_repo.create(
                user_id=court.manager_id,
                type_="booking_created",
                message=f"رزرو جدید برای {court.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')}",
            )

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            participants_count=booking.participants_count,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            court_name=court.name if court else "",
            court_address=court.address if court else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment) if payment else None,
        )

    async def create_booking(self, data: BookingCreate) -> BookingDetailResponse:
        slot = await self.slot_repo.get_by_id(data.slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس قبلاً رزرو شده است"
            )

        if slot.version != data.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این سانس تغییر کرده است. لطفاً صفحه را به‌روز کنید.",
            )

        court = slot.court
        if data.participants_count > court.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تعداد شرکت‌کنندگان بیش از ظرفیت مجموعه است",
            )

        existing = await self.booking_repo.get_by_slot(data.slot_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این سانس قبلاً رزرو شده است"
            )

        booking = await self.booking_repo.create(
            {
                "user_id": self.current_user.id,
                "slot_id": data.slot_id,
                "status": BookingStatus.PENDING_PAYMENT,
                "price_paid": float(slot.base_price),
                "participants_count": data.participants_count,
                "expires_at": now_utc() + timedelta(minutes=10),
            }
        )

        # Notify manager about new booking
        if court:
            await self.notify_repo.create(
                user_id=court.manager_id,
                type_="booking_created",
                message=f"رزرو جدید برای {court.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')}",
            )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "booking_created",
            f"ایجاد رزرو | رزرو {booking.id} برای سانس {data.slot_id} - مجموعه {court.name}",
        )

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            participants_count=booking.participants_count,
            penalty_amount=None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            court_name=court.name if court else "",
            court_address=court.address if court else "",
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
        booking = await self.booking_repo.get_by_id(booking_id)
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

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="این سانس قبلاً رزرو شده است",
            )
        court = slot.court

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

        # Mark slot as reserved using optimistic locking
        await self.slot_repo.update(slot, {"is_reserved": True})

        # Update booking status
        booking = await self.booking_repo.update(booking, {"status": BookingStatus.CONFIRMED})

        # Notify user about confirmed booking
        await self.notify_repo.create(
            user_id=self.current_user.id,
            type_="booking_confirmed",
            message=f"رزرو شما برای {court.name if court else 'زمین'} تایید شد",
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
            participants_count=booking.participants_count,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            court_name=court.name if court else "",
            court_address=court.address if court else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment),
        )

    async def cancel_booking(self, booking_id: int) -> BookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این رزرو دسترسی ندارید"
            )
        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این رزرو قبلاً لغو شده است"
            )

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        court = slot.court

        was_confirmed = booking.status == BookingStatus.CONFIRMED

        now = now_utc()
        hours_until_slot = (slot.start_time - now).total_seconds() / 3600

        if hours_until_slot < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="امکان لغو در ۲ ساعت مانده به شروع سانس وجود ندارد",
            )

        if hours_until_slot <= 24:
            penalty_amount = float(booking.price_paid) * 0.5
            refund_amount = float(booking.price_paid) * 0.5
            update_data: dict = {
                "status": BookingStatus.CANCELLED,
                "penalty_amount": penalty_amount,
            }
            await self.penalty_repo.create(
                user_id=self.current_user.id,
                booking_id=booking_id,
                amount=penalty_amount,
                reason="Cancellation within 2-24 hours of session start",
            )
            await log_action(
                self.booking_repo.db,
                self.current_user.id,
                "penalty_created",
                f"جریمه لغو رزرو | رزرو {booking_id} — مبلغ {penalty_amount} تومان (کنسلی در ۲۴ ساعت پایانی)",
            )
        else:
            refund_amount = float(booking.price_paid)
            update_data = {
                "status": BookingStatus.CANCELLED,
                "penalty_amount": None,
            }

        booking = await self.booking_repo.update(booking, update_data)

        # Free the slot if it was confirmed
        if was_confirmed:
            await self.slot_repo.update(slot, {"is_reserved": False})

        wallet = await self.wallet_repo.get_or_create(self.current_user.id)
        await self.wallet_repo.add_balance(
            wallet, refund_amount, f"Refund for cancelled booking #{booking_id}"
        )

        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "wallet_credited",
            f"بازگشت وجه به کیف پول | رزرو {booking_id} — مبلغ {refund_amount} تومان",
        )

        # Notify manager about cancellation
        if court:
            await self.notify_repo.create(
                user_id=court.manager_id,
                type_="booking_cancelled",
                message=f"رزرو {court.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')} لغو شد",
            )

        penalty_note = f" (جریمه: {penalty_amount} تومان)" if hours_until_slot <= 24 else ""
        await log_action(
            self.booking_repo.db,
            self.current_user.id,
            "booking_cancelled",
            f"لغو رزرو | رزرو {booking_id} لغو شد — {refund_amount} تومان به کیف پول بازگشت{penalty_note}",
        )

        payment = await self.payment_repo.get_by_booking(booking_id)
        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            participants_count=booking.participants_count,
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            expires_at=booking.expires_at,
            court_name=court.name if court else "",
            court_address=court.address if court else "",
            slot_start_time=slot.start_time if slot else None,
            slot_end_time=slot.end_time if slot else None,
            payment=PaymentResponse.model_validate(payment) if payment else None,
        )

    async def list_all_bookings(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> AdminBookingListResponse:
        bookings, total = await self.booking_repo.list_all(
            skip=skip, limit=limit, search=search, status_filter=status_filter
        )
        result = []
        for b in bookings:
            slot = await self.slot_repo.get_by_id(b.slot_id)
            court = slot.court if slot else None
            user = b.user  # relationship loaded
            result.append(
                AdminBookingResponse(
                    id=b.id,
                    user_id=b.user_id,
                    slot_id=b.slot_id,
                    status=b.status.value if hasattr(b.status, "value") else b.status,
                    price_paid=float(b.price_paid),
                    penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                    participants_count=b.participants_count,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    expires_at=b.expires_at,
                    court_name=court.name if court else "",
                    court_address=court.address if court else "",
                    user_name=user.full_name if user else "",
                    slot_start_time=slot.start_time if slot else None,
                    slot_end_time=slot.end_time if slot else None,
                )
            )
        return AdminBookingListResponse(bookings=result, total=total)


async def get_booking_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingService:
    return BookingService(db=db, current_user=current_user)
