from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingStatus
from app.models.court import Court
from app.models.review import Review
from app.models.user import User, UserRole
from app.repositories.booking_repo import BookingRepo
from app.repositories.review_repo import ReviewRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.schemas.review import ReviewCreate, ReviewDetailResponse, ReviewListResponse


class ReviewService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.review_repo = ReviewRepo(db)
        self.booking_repo = BookingRepo(db)
        self.slot_repo = TimeSlotRepo(db)
        self.current_user = current_user

    async def list_my(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> ReviewListResponse:
        reviews, total = await self.review_repo.list_by_user(
            self.current_user.id, skip=skip, limit=limit
        )
        items = []
        for review in reviews:
            court_name = review.court.name if review.court else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.court_name = court_name
            item.user_name = user_name
            items.append(item)
        return ReviewListResponse(reviews=items, total=total)

    async def list_by_court(
        self,
        court_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> ReviewListResponse:
        reviews, total = await self.review_repo.list_by_court(court_id, skip=skip, limit=limit)
        items = []
        for review in reviews:
            court_name = review.court.name if review.court else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.court_name = court_name
            item.user_name = user_name
            items.append(item)
        return ReviewListResponse(reviews=items, total=total)

    async def list_recent(
        self,
        *,
        limit: int = 5,
    ) -> ReviewListResponse:
        reviews = await self.review_repo.list_recent(limit=limit)
        items = []
        for review in reviews:
            court_name = review.court.name if review.court else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.court_name = court_name
            item.user_name = user_name
            items.append(item)
        return ReviewListResponse(reviews=items, total=len(items))

    async def create(self, data: ReviewCreate) -> ReviewDetailResponse:
        booking = await self.booking_repo.get_by_id(data.booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your booking",
            )

        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is not confirmed",
            )

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time slot not found",
            )

        from datetime import datetime, timedelta, timezone

        if slot.end_time + timedelta(hours=2) > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review can only be submitted 2 hours after the session ends",
            )

        # Validate no existing review for this booking
        existing = await self.review_repo.get_by_booking(data.booking_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking already has a review",
            )

        court_id = slot.court.id if slot.court else None

        # Create review
        review = await self.review_repo.create(
            {
                "user_id": self.current_user.id,
                "booking_id": data.booking_id,
                "rating": data.rating,
                "comment": data.comment,
                "court_id": court_id,
            }
        )

        # Update court's average rating
        if court_id:
            await self._recalc_court_rating(court_id)

        # Enrich with court_name and user_name
        court_name = slot.court.name if slot.court else ""
        user_name = self.current_user.full_name

        item = ReviewDetailResponse.model_validate(review)
        item.court_name = court_name
        item.user_name = user_name
        return item

    async def respond(self, review_id: int, response: str) -> ReviewDetailResponse:
        if self.current_user.role not in ("manager", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only manager or admin can respond to reviews",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        # Verify manager owns the court
        if self.current_user.role == "manager":
            court = review.court
            if not court or court.manager_id != self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't manage this court",
                )

        review.response = response
        await self.review_repo.db.commit()
        await self.review_repo.db.refresh(review)

        item = ReviewDetailResponse.model_validate(review)
        item.court_name = review.court.name if review.court else ""
        item.user_name = review.user.full_name if review.user else ""
        return item

    async def delete_review(self, review_id: int) -> None:
        if self.current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can delete reviews",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        court_id = review.court_id
        await self.review_repo.delete(review)

        # Recalculate court's average rating
        await self._recalc_court_rating(court_id)

    async def report(self, review_id: int) -> dict:
        if self.current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can report reviews",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        review.is_reported = True
        await self.review_repo.db.commit()
        return {"success": True}

    async def _recalc_court_rating(self, court_id: int) -> None:
        """Recalculate and persist the court's average_rating from all active reviews."""
        result = await self.review_repo.db.execute(
            select(func.coalesce(func.avg(Review.rating), 0.0)).where(
                Review.court_id == court_id,
                Review.is_reported == False,
            )
        )
        avg = float(result.scalar_one())
        await self.review_repo.db.execute(select(Court).where(Court.id == court_id))
        court = await self.review_repo.db.get(Court, court_id)
        if court:
            court.average_rating = round(avg, 1)
            await self.review_repo.db.commit()
