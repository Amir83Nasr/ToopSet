from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.user import User
from app.repositories.booking_repo import BookingRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.penalty_repo import PenaltyRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.wallet_repo import WalletRepo
from app.schemas.booking import (
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
    BookingResponse,
    PaymentResponse,
)
from app.services.payment_service import PaymentError, PaymentService


class BookingService:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.booking_repo = BookingRepo(db)
        self.slot_repo = TimeSlotRepo(db)
        self.payment_repo = PaymentRepo(db)
        self.current_user = current_user

    async def list_my_bookings(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> BookingListResponse:
        bookings, total = await self.booking_repo.list_by_user(
            self.current_user.id, skip=skip, limit=limit
        )
        return BookingListResponse(
            bookings=[BookingResponse.model_validate(b) for b in bookings],
            total=total,
        )

    async def get_booking(self, booking_id: int) -> BookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        court = slot.court if slot else None
        payment = await self.payment_repo.get_by_booking(booking_id)
        # Notify manager about new booking
        if court:
            notify_repo = NotificationRepo(self.booking_repo.db)
            await notify_repo.create(
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        if slot.is_reserved:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot already reserved")

        if slot.version != data.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot has been modified. Please refresh and try again.",
            )

        court = slot.court
        if data.participants_count > court.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participants count exceeds court capacity",
            )

        existing = await self.booking_repo.get_by_slot(data.slot_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot already has a booking")

        booking = await self.booking_repo.create({
            "user_id": self.current_user.id,
            "slot_id": data.slot_id,
            "status": BookingStatus.PENDING_PAYMENT,
            "price_paid": float(slot.base_price),
            "participants_count": data.participants_count,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        })

        # Notify manager about new booking
        if court:
            notify_repo = NotificationRepo(self.booking_repo.db)
            await notify_repo.create(
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

    async def pay_booking(self, booking_id: int) -> BookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.user_id != self.current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
        if booking.status != BookingStatus.PENDING_PAYMENT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not pending payment")

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        court = slot.court

        # Process mock payment
        payment_service = PaymentService()
        try:
            gateway_id = await payment_service.process_payment(float(booking.price_paid))
        except PaymentError:
            # Payment failed — create failed record, keep booking pending
            await self.payment_repo.create({
                "booking_id": booking_id,
                "amount": float(booking.price_paid),
                "gateway_transaction_id": None,
                "status": "failed",
            })
            # Notify user about failed payment
            notify_repo = NotificationRepo(self.booking_repo.db)
            await notify_repo.create(
                user_id=self.current_user.id,
                type_="booking_failed",
                message="پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.",
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.",
            )

        payment = await self.payment_repo.create({
            "booking_id": booking_id,
            "amount": float(booking.price_paid),
            "gateway_transaction_id": gateway_id,
            "status": "success",
        })

        # Mark slot as reserved using optimistic locking
        await self.slot_repo.update(slot, {"is_reserved": True})

        # Update booking status
        booking = await self.booking_repo.update(booking, {"status": BookingStatus.CONFIRMED})

        # Notify user about confirmed booking
        notify_repo = NotificationRepo(self.booking_repo.db)
        await notify_repo.create(
            user_id=self.current_user.id,
            type_="booking_confirmed",
            message=f"رزرو شما برای {court.name if court else 'زمین'} تایید شد",
        )

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.user_id != self.current_user.id and self.current_user.role not in ("admin",):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking already cancelled")

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        court = slot.court

        was_confirmed = booking.status == BookingStatus.CONFIRMED

        now = datetime.now(timezone.utc)
        hours_until_slot = (slot.start_time - now).total_seconds() / 3600

        if hours_until_slot < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel within 2 hours of the session start time",
            )

        penalty_repo = PenaltyRepo(self.booking_repo.db)
        wallet_repo = WalletRepo(self.booking_repo.db)

        if hours_until_slot <= 24:
            penalty_amount = float(booking.price_paid) * 0.5
            refund_amount = float(booking.price_paid) * 0.5
            update_data: dict = {
                "status": BookingStatus.CANCELLED,
                "penalty_amount": penalty_amount,
            }
            await penalty_repo.create(
                user_id=self.current_user.id,
                booking_id=booking_id,
                amount=penalty_amount,
                reason="Cancellation within 2-24 hours of session start",
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

        wallet = await wallet_repo.get_or_create(self.current_user.id)
        await wallet_repo.add_balance(wallet, refund_amount, f"Refund for cancelled booking #{booking_id}")

        # Notify manager about cancellation
        if court:
            notify_repo = NotificationRepo(self.booking_repo.db)
            await notify_repo.create(
                user_id=court.manager_id,
                type_="booking_cancelled",
                message=f"رزرو {court.name} در تاریخ {slot.start_time.strftime('%Y-%m-%d')} لغو شد",
            )
        payment = await self.payment_repo.get_by_booking(booking_id)
        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
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


async def get_booking_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingService:
    return BookingService(db=db, current_user=current_user)
