from __future__ import annotations

import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Review


class ReviewRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_court(
        self,
        court_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Review], int]:
        query = (
            select(Review)
            .options(selectinload(Review.court), selectinload(Review.user))
            .where(Review.court_id == court_id)
            .order_by(Review.created_at.desc())
        )
        count_q = select(func.count(Review.id)).where(Review.court_id == court_id)

        if after_id is not None:
            query = query.where(Review.id > after_id)

        if after_id is not None:
            data_task = self.db.execute(query.limit(limit))
        else:
            data_task = self.db.execute(query.offset(skip).limit(limit))
        count_task = self.db.execute(count_q)
        result, count_result = await asyncio.gather(data_task, count_task)

        reviews = list(result.scalars().all())
        total = count_result.scalar_one()
        return reviews, total

    async def list_by_user(
        self,
        user_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Review], int]:
        query = (
            select(Review)
            .options(selectinload(Review.court), selectinload(Review.user))
            .where(Review.user_id == user_id)
            .order_by(Review.created_at.desc())
        )
        count_q = select(func.count(Review.id)).where(Review.user_id == user_id)

        if after_id is not None:
            query = query.where(Review.id > after_id)

        if after_id is not None:
            data_task = self.db.execute(query.limit(limit))
        else:
            data_task = self.db.execute(query.offset(skip).limit(limit))
        count_task = self.db.execute(count_q)
        result, count_result = await asyncio.gather(data_task, count_task)

        reviews = list(result.scalars().all())
        total = count_result.scalar_one()
        return reviews, total

    async def get_by_id(self, review_id: int) -> Review | None:
        result = await self.db.execute(
            select(Review)
            .options(selectinload(Review.court), selectinload(Review.user))
            .where(Review.id == review_id)
        )
        return result.scalar_one_or_none()

    async def list_recent(
        self,
        *,
        limit: int = 5,
    ) -> list[Review]:
        query = (
            select(Review)
            .options(
                selectinload(Review.court),
                selectinload(Review.user),
            )
            .where(Review.is_reported == False)
            .order_by(Review.created_at.desc())
        )
        result = await self.db.execute(query.limit(limit))
        return list(result.scalars().all())

    async def get_by_booking(self, booking_id: int) -> Review | None:
        result = await self.db.execute(select(Review).where(Review.booking_id == booking_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Review:
        review = Review(**data)
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def delete(self, review: Review) -> None:
        await self.db.delete(review)
        await self.db.flush()
