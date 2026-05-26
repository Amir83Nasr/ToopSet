from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.user import User
from app.repositories.booking_repo import BookingRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.schemas.booking import (
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
    BookingResponse,
    PaymentResponse,
)
from app.services.payment_service import PaymentService


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
        payment = await self.payment_repo.get_by_booking(booking_id)
        court = slot.court if slot else None

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
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

        existing = await self.booking_repo.get_by_slot(data.slot_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot already has a booking")

        booking = await self.booking_repo.create({
            "user_id": self.current_user.id,
            "slot_id": data.slot_id,
            "status": BookingStatus.PENDING_PAYMENT,
            "price_paid": float(slot.base_price),
        })

        slot = await self.slot_repo.get_by_id(data.slot_id)
        court = slot.court if slot else None

        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            penalty_amount=None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
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

        # Process mock payment
        payment_service = PaymentService()
        gateway_id = await payment_service.process_payment(booking.price_paid)

        payment = await self.payment_repo.create({
            "booking_id": booking_id,
            "amount": booking.price_paid,
            "gateway_transaction_id": gateway_id,
            "status": "success",
        })

        # Mark slot as reserved using optimistic locking
        await self.slot_repo.update(slot, {"is_reserved": True})

        # Update booking status
        booking = await self.booking_repo.update(booking, {"status": BookingStatus.CONFIRMED})

        court = slot.court if slot else None
        return BookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            slot_id=booking.slot_id,
            status=booking.status,
            price_paid=float(booking.price_paid),
            penalty_amount=float(booking.penalty_amount) if booking.penalty_amount else None,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
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

        booking = await self.booking_repo.update(booking, {"status": BookingStatus.CANCELLED})

        # Free the slot if it was confirmed
        if slot and booking.status == BookingStatus.CONFIRMED:
            await self.slot_repo.update(slot, {"is_reserved": False})

        court = slot.court if slot else None
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
