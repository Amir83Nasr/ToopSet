from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingStatus
from app.models.review import Review
from app.models.user import User, UserRole
from app.models.vendor import Vendor
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
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> ReviewListResponse:
        reviews, total = await self.review_repo.list_by_user(
            self.current_user.id, after_id=after_id, skip=skip, limit=limit
        )
        items = []
        for review in reviews:
            vendor_name = review.vendor.name if review.vendor else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.vendor_name = vendor_name
            item.user_name = user_name
            items.append(item)
        next_cursor = None
        if reviews and len(reviews) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(reviews[-1].id)
        return ReviewListResponse(reviews=items, total=total, next_cursor=next_cursor)

    async def list_by_vendor(
        self,
        vendor_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> ReviewListResponse:
        reviews, total = await self.review_repo.list_by_vendor(
            vendor_id, after_id=after_id, skip=skip, limit=limit
        )
        items = []
        for review in reviews:
            vendor_name = review.vendor.name if review.vendor else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.vendor_name = vendor_name
            item.user_name = user_name
            items.append(item)
        next_cursor = None
        if reviews and len(reviews) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(reviews[-1].id)
        return ReviewListResponse(reviews=items, total=total, next_cursor=next_cursor)

    async def list_recent(
        self,
        *,
        limit: int = 5,
    ) -> ReviewListResponse:
        reviews = await self.review_repo.list_recent(limit=limit)
        items = []
        for review in reviews:
            vendor_name = review.vendor.name if review.vendor else ""
            user_name = review.user.full_name if review.user else ""
            item = ReviewDetailResponse.model_validate(review)
            item.vendor_name = vendor_name
            item.user_name = user_name
            items.append(item)
        return ReviewListResponse(reviews=items, total=len(items))

    async def create(self, data: ReviewCreate) -> ReviewDetailResponse:
        booking = await self.booking_repo.get_by_id(data.booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="رزرو یافت نشد",
            )

        if booking.user_id != self.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="شما به این رزرو دسترسی ندارید",
            )

        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="این رزرو تایید نشده است",
            )

        slot = await self.slot_repo.get_by_id(booking.slot_id)
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="سانس یافت نشد",
            )

        from datetime import datetime, timedelta, timezone

        if slot.end_time + timedelta(hours=2) > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="امکان ثبت نظر ۲ ساعت پس از پایان سانس فراهم است",
            )

        # Validate no existing review for this booking
        existing = await self.review_repo.get_by_booking(data.booking_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="برای این رزرو قبلاً نظر ثبت شده است",
            )

        vendor_id = slot.vendor.id if slot.vendor else None

        # Create review
        review = await self.review_repo.create(
            {
                "user_id": self.current_user.id,
                "booking_id": data.booking_id,
                "rating": data.rating,
                "comment": data.comment,
                "vendor_id": vendor_id,
            }
        )

        # Update vendor's average rating
        if vendor_id:
            await self._recalc_vendor_rating(vendor_id)

        # Enrich with vendor_name and user_name
        vendor_name = slot.vendor.name if slot.vendor else ""
        user_name = self.current_user.full_name

        item = ReviewDetailResponse.model_validate(review)
        item.vendor_name = vendor_name
        item.user_name = user_name
        return item

    async def respond(self, review_id: int, response: str) -> ReviewDetailResponse:
        if self.current_user.role not in ("manager", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="فقط مدیر مجموعه یا ادمین می‌توانند به نظرات پاسخ دهند",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="نظر یافت نشد",
            )

        # Verify manager owns the vendor
        if self.current_user.role == "manager":
            vendor = review.vendor
            if not vendor or vendor.manager_id != self.current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="شما مدیر این مجموعه نیستید",
                )

        review.response = response
        await self.review_repo.db.flush()
        await self.review_repo.db.refresh(review)

        item = ReviewDetailResponse.model_validate(review)
        item.vendor_name = review.vendor.name if review.vendor else ""
        item.user_name = review.user.full_name if review.user else ""
        return item

    async def delete_review(self, review_id: int) -> None:
        if self.current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="فقط ادمین می‌تواند نظرات را حذف کند",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="نظر یافت نشد",
            )

        vendor_id = review.vendor_id
        await self.review_repo.delete(review)

        # Recalculate vendor's average rating
        await self._recalc_vendor_rating(vendor_id)

    async def report(self, review_id: int) -> dict:
        if self.current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="فقط ادمین می‌تواند نظرات را گزارش کند",
            )

        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="نظر یافت نشد",
            )

        review.is_reported = True
        await self.review_repo.db.flush()
        return {"success": True}

    async def _recalc_vendor_rating(self, vendor_id: int) -> None:
        """Recalculate and persist the vendor's average_rating from all active reviews."""
        result = await self.review_repo.db.execute(
            select(func.coalesce(func.avg(Review.rating), 0.0)).where(
                Review.vendor_id == vendor_id,
                Review.is_reported == False,
            )
        )
        avg = float(result.scalar_one())
        await self.review_repo.db.execute(select(Vendor).where(Vendor.id == vendor_id))
        vendor = await self.review_repo.db.get(Vendor, vendor_id)
        if vendor:
            vendor.average_rating = round(avg, 1)
            await self.review_repo.db.flush()
