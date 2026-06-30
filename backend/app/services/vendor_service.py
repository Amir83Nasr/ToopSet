from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_manager, get_current_user_optional
from app.core.database import get_db
from app.core.logger import log_action
from app.core.redis_client import get_redis
from app.core.upload import delete_upload as delete_file
from app.models.user import User
from app.models.vendor import SportType, Vendor
from app.models.vendor_image import VendorImage
from app.repositories.vendor_repo import VendorRepo
from app.schemas.vendor import (
    VendorCreate,
    VendorImageResponse,
    VendorListResponse,
    VendorResponse,
    VendorUpdate,
)


class VendorService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.repo = VendorRepo(db)
        self.current_user = current_user

    async def list_vendors(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        sport_types: list[SportType] | None = None,
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
    ) -> VendorListResponse:
        # If user is admin/manager, default to showing all vendors (active=None)
        manager_id: int | None = None
        if self.current_user and self.current_user.role in ("admin", "manager"):
            if is_active is None:
                is_active = None
            if self.current_user.role == "manager":
                manager_id = self.current_user.id
        else:
            # Public user: force active=True
            is_active = True

        vendors, total = await self.repo.list(
            after_id=after_id,
            skip=skip,
            limit=limit,
            sport_types=sport_types,
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
        prices = await self.repo.get_min_prices([c.id for c in vendors])
        next_cursor = None
        if vendors and len(vendors) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(vendors[-1].id)
        return VendorListResponse(
            vendors=[self._to_response(c, min_price=prices.get(c.id)) for c in vendors],
            total=total,
            next_cursor=next_cursor,
        )

    async def get_vendor(self, vendor_id: int) -> VendorResponse:
        vendor = await self.repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if not vendor.is_active and (
            self.current_user is None or self.current_user.role not in ("admin", "manager")
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        prices = await self.repo.get_min_prices([vendor_id])
        return self._to_response(vendor, min_price=prices.get(vendor_id))

    async def create_vendor(self, data: VendorCreate) -> VendorResponse:
        if self.current_user.role != "manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="فقط مدیران مجموعه می‌توانند مجموعه ثبت کنند",
            )
        vendor = await self.repo.create(
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
                self.repo.db.add(VendorImage(vendor_id=vendor.id, url=url, order=idx))
            await self.repo.db.flush()

        # Reload vendor with images to avoid MissingGreenlet error
        vendor = await self.repo.get_by_id_with_images(vendor.id)

        await log_action(
            self.repo.db,
            self.current_user.id,
            "vendor_created",
            f"ایجاد مجموعه | '{vendor.name}' (id={vendor.id}) - {len(urls)} تصویر",
        )
        prices = await self.repo.get_min_prices([vendor.id])
        return self._to_response(vendor, min_price=prices.get(vendor.id))

    async def update_vendor(self, vendor_id: int, data: VendorUpdate) -> VendorResponse:
        vendor = await self.repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if vendor.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید"
            )
        update_data = data.model_dump(exclude_none=True, exclude={"images", "image_ids_to_remove"})
        if self.current_user.role != "admin" and "is_active" in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="تغییر وضعیت تأیید مجموعه فقط توسط ادمین امکان‌پذیر است",
            )
        updated = await self.repo.update(vendor, update_data)
        if data.image_ids_to_remove:
            result = await self.repo.db.execute(
                select(VendorImage).where(
                    VendorImage.id.in_(data.image_ids_to_remove),
                    VendorImage.vendor_id == vendor_id,
                )
            )
            for img in result.scalars().all():
                delete_file(img.url)
                await self.repo.db.delete(img)
            await self.repo.db.flush()
        if data.images is not None:
            # Replace all vendor images with the provided set (order matters)
            existing = (
                (
                    await self.repo.db.execute(
                        select(VendorImage)
                        .where(VendorImage.vendor_id == vendor_id)
                        .order_by(VendorImage.order)
                    )
                )
                .scalars()
                .all()
            )
            old_by_url = {img.url: img for img in existing}
            new_urls = data.images
            new_urls_set = set(new_urls)

            # Delete images no longer in the set + remove physical files
            for url, img in old_by_url.items():
                if url not in new_urls_set:
                    delete_file(img.url)
                    await self.repo.db.delete(img)

            # Add new images and reorder all to match provided order
            for idx, url in enumerate(new_urls):
                if url in old_by_url:
                    old_by_url[url].order = idx
                else:
                    self.repo.db.add(VendorImage(vendor_id=vendor_id, url=url, order=idx))
            await self.repo.db.flush()
        await self.repo.db.refresh(updated, ["vendor_images", "manager"])
        details_parts = [f"ویرایش مجموعه | '{updated.name}' (id={vendor_id})"]
        if data.images:
            details_parts.append(f"{len(data.images)} تصویر جدید")
        if data.image_ids_to_remove:
            details_parts.append(f"{len(data.image_ids_to_remove)} تصویر حذف شده")
        await log_action(
            self.repo.db,
            self.current_user.id,
            "vendor_updated",
            " — ".join(details_parts),
        )
        prices = await self.repo.get_min_prices([vendor_id])
        return self._to_response(updated, min_price=prices.get(vendor_id))

    async def delete_vendor(self, vendor_id: int) -> None:
        vendor = await self.repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if vendor.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید"
            )
        # delete image files before removing the vendor record
        for img in vendor.vendor_images or []:
            delete_file(img.url)
        await self.repo.delete(vendor)
        await log_action(
            self.repo.db,
            self.current_user.id,
            "vendor_deleted",
            f"حذف مجموعه | '{vendor.name}' (id={vendor_id})",
        )

    async def toggle_vendor_status(self, vendor_id: int, is_active: bool) -> VendorResponse:
        vendor = await self.repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if vendor.manager_id != self.current_user.id and self.current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="شما مدیر این مجموعه نیستید"
            )
        updated = await self.repo.update(vendor, {"is_active": is_active})
        await self.repo.db.refresh(updated, ["vendor_images", "manager"])
        status_label = "فعال" if is_active else "غیرفعال"
        await log_action(
            self.repo.db,
            self.current_user.id,
            "vendor_toggled",
            f"تغییر وضعیت مجموعه | '{vendor.name}' (id={vendor_id}) → {status_label}",
        )
        prices = await self.repo.get_min_prices([vendor_id])
        return self._to_response(updated, min_price=prices.get(vendor_id))

    def _to_response(self, vendor: Vendor, min_price: Decimal | None = None) -> VendorResponse:
        resp = VendorResponse.model_validate(vendor)
        if min_price is not None:
            resp.base_price = min_price
        if vendor.manager:
            resp.manager_name = vendor.manager.full_name
            resp.manager_phone = vendor.manager.phone
        if vendor.vendor_images:
            ordered = sorted(vendor.vendor_images, key=lambda x: x.order)
            resp.images = [img.url for img in ordered]
            resp.vendor_images = [VendorImageResponse.model_validate(img) for img in ordered]
        return resp


async def get_vendor_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
) -> VendorService:
    return VendorService(db=db, current_user=current_user)


async def get_vendor_service_public(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> VendorService:
    return VendorService(db=db, current_user=current_user)
