from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review


class ReviewRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_court(
        self,
        court_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Review], int]:
        query = select(Review).where(Review.court_id == court_id).order_by(Review.created_at.desc())
        count_q = select(func.count(Review.id)).where(Review.court_id == court_id)

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        reviews = list(result.scalars().all())
        return reviews, total

    async def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Review], int]:
        query = select(Review).where(Review.user_id == user_id).order_by(Review.created_at.desc())
        count_q = select(func.count(Review.id)).where(Review.user_id == user_id)

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        reviews = list(result.scalars().all())
        return reviews, total

    async def get_by_id(self, review_id: int) -> Review | None:
        result = await self.db.execute(select(Review).where(Review.id == review_id))
        return result.scalar_one_or_none()

    async def get_by_booking(self, booking_id: int) -> Review | None:
        result = await self.db.execute(select(Review).where(Review.booking_id == booking_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Review:
        review = Review(**data)
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def delete(self, review: Review) -> None:
        await self.db.delete(review)
        await self.db.commit()
