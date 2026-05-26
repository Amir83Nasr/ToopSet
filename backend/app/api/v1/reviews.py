from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewDetailResponse, ReviewListResponse, ReviewRespondRequest
from app.services.review_service import ReviewService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/reviews", tags=["reviews"])


def get_review_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewService:
    return ReviewService(db=db, current_user=current_user)


@router.get("/my", response_model=ReviewListResponse)
async def list_my_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: ReviewService = Depends(get_review_service),
):
    return await service.list_my(skip=skip, limit=limit)


@router.post("", response_model=ReviewDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    service: ReviewService = Depends(get_review_service),
):
    return await service.create(data)


@router.post("/{review_id}/report")
async def report_review(
    review_id: int,
    service: ReviewService = Depends(get_review_service),
):
    return await service.report(review_id)


@router.post("/{review_id}/respond", response_model=ReviewDetailResponse)
async def respond_to_review(
    review_id: int,
    data: ReviewRespondRequest,
    service: ReviewService = Depends(get_review_service),
):
    return await service.respond(review_id, data.response)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    service: ReviewService = Depends(get_review_service),
):
    await service.delete_review(review_id)
