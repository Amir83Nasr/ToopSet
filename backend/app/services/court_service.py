from __future__ import annotations

from datetime import datetime

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager, get_current_user_optional
from app.core.database import get_db
from app.core.logger import log_action
from app.core.redis_client import get_redis
from app.models.court import Court, SportType
from app.models.court_image import CourtImage
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.schemas.court import (
    CourtCreate,
    CourtImageResponse,
    CourtListResponse,
    CourtResponse,
    CourtUpdate,
)


class CourtService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.repo = CourtRepo(db)
        self.current_user = current_user

    async def list_courts(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        sport_type: SportType | None = None,
        search: str | None = None,
        is_active: bool | None = None,  # Changed default from None to allow explicit control
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        ref_lat: float | None = None,
        ref_lon: float | None = None,
        max_distance_km: float | None = None,
        sort: str = "default",
    ) -> CourtListResponse:
        # If user is admin/manager, default to showing all courts (active=None)
        manager_id: int | None = None
        if self.current_user and self.current_user.role in ("admin", "manager"):
            if is_active is None:
                is_active = None
            if self.current_user.role == "manager":
                manager_id = self.current_user.id
        else:
            # Public user: force active=True
            is_active = True

        courts, total = await self.repo.list(
            skip=skip,
            limit=limit,
            sport_type=sport_type,
            is_active=is_active,
            manager_id=manager_id,
            search=search,
            date_from=date_from,
            date_to=date_to,
            price_min=price_min,
            price_max=price_max,
            sort=sort,
            ref_lat=ref_lat,
            ref_lon=ref_lon,
            max_distance_km=max_distance_km,
        )
        return CourtListResponse(
            courts=[self._to_response(c) for c in courts],
            total=total,
        )

    async def get_court(self, court_id: int) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if not court.is_active and (
            self.current_user is None or self.current_user.role not in ("admin", "manager")
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        return self._to_response(court)

    async def create_court(self, data: CourtCreate) -> CourtResponse:
        if self.current_user.role != "manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can create courts",
            )
        existing_count = await self.repo.count_by_manager(self.current_user.id)
        if existing_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="شما قبلاً یک مجموعه ثبت کرده‌اید. هر مدیر فقط می‌تواند یک مجموعه داشته باشد.",
            )
        court = await self.repo.create(
            data.model_dump(exclude={"images", "temp_ids"})
            | {"manager_id": self.current_user.id, "is_active": False}
        )
        urls: list[str] = []
        if data.temp_ids:
            r = await get_redis()
            import logging

            logger = logging.getLogger(__name__)
            logger.info(f"Attempting to retrieve temp_ids: {data.temp_ids}")
            for tid in data.temp_ids:
                url = await r.get(f"temp_upload:{tid}")
                logger.info(f"Retrieved URL for {tid}: {url}")
                if not url:
                    logger.error(f"Failed to retrieve URL for {tid}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"تصویر با شناسه {tid} منقضی شده است. لطفاً دوباره آپلود کنید.",
                    )
                urls.append(url)
                await r.delete(f"temp_upload:{tid}")
        elif data.images:
            urls = data.images
        if urls:
            for idx, url in enumerate(urls):
                self.repo.db.add(CourtImage(court_id=court.id, url=url, order=idx))
            await self.repo.db.commit()

        # Reload court with images to avoid MissingGreenlet error
        court = await self.repo.get_by_id_with_images(court.id)

        await log_action(
            self.repo.db,
            self.current_user.id,
            "court_created",
            f"ایجاد مجموعه | '{court.name}' (id={court.id}) - {len(urls)} تصویر",
        )
        return self._to_response(court)

    async def update_court(self, court_id: int, data: CourtUpdate) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your court")
        update_data = data.model_dump(exclude_none=True, exclude={"images", "image_ids_to_remove"})
        updated = await self.repo.update(court, update_data)
        if data.image_ids_to_remove:
            result = await self.repo.db.execute(
                select(CourtImage).where(
                    CourtImage.id.in_(data.image_ids_to_remove),
                    CourtImage.court_id == court_id,
                )
            )
            for img in result.scalars().all():
                await self.repo.db.delete(img)
            await self.repo.db.commit()
        if data.images:
            existing = (
                (
                    await self.repo.db.execute(
                        select(CourtImage)
                        .where(CourtImage.court_id == court_id)
                        .order_by(CourtImage.order)
                    )
                )
                .scalars()
                .all()
            )
            next_order = max((img.order for img in existing), default=-1) + 1
            for idx, url in enumerate(data.images):
                self.repo.db.add(CourtImage(court_id=court_id, url=url, order=next_order + idx))
            await self.repo.db.commit()
        await self.repo.db.refresh(updated, ["court_images", "manager"])
        await log_action(
            self.repo.db,
            self.current_user.id,
            "court_updated",
            f"ویرایش مجموعه | '{updated.name}' (id={court_id}) - {len(data.images or [])} تصویر جدید",
        )
        return self._to_response(updated)

    async def delete_court(self, court_id: int) -> None:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your court")
        await self.repo.delete(court)
        await log_action(
            self.repo.db,
            self.current_user.id,
            "court_deleted",
            f"حذف مجموعه | '{court.name}' (id={court_id})",
        )

    async def toggle_court_status(self, court_id: int, is_active: bool) -> CourtResponse:
        court = await self.repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if court.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't manage this court"
            )
        updated = await self.repo.update(court, {"is_active": is_active})
        await self.repo.db.refresh(updated, ["court_images", "manager"])
        status_label = "فعال" if is_active else "غیرفعال"
        await log_action(
            self.repo.db,
            self.current_user.id,
            "court_toggled",
            f"تغییر وضعیت مجموعه | '{court.name}' (id={court_id}) → {status_label}",
        )
        return self._to_response(updated)

    def _to_response(self, court: Court) -> CourtResponse:
        resp = CourtResponse.model_validate(court)
        if court.manager:
            resp.manager_name = court.manager.full_name
        if court.court_images:
            ordered = sorted(court.court_images, key=lambda x: x.order)
            resp.images = [img.url for img in ordered]
            resp.court_images = [CourtImageResponse.model_validate(img) for img in ordered]
        elif court.images:
            resp.images = court.images
        return resp


async def get_court_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
) -> CourtService:
    return CourtService(db=db, current_user=current_user)


async def get_court_service_public(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> CourtService:
    return CourtService(db=db, current_user=current_user)
