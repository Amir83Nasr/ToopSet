from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import log_action
from app.core.upload import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, delete_upload, save_upload
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    AvatarUploadResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, service: AuthService = Depends(_auth_service)):
    user, access_token, refresh_token = await service.register(
        phone=body.phone,
        password=body.password,
        full_name=body.full_name,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, service: AuthService = Depends(_auth_service)):
    user, access_token, refresh_token = await service.login(
        phone=body.phone,
        password=body.password,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, service: AuthService = Depends(_auth_service)):
    new_access, new_refresh = await service.refresh(body.refresh_token)
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    updated_user = await service.update_profile(current_user, body)
    return UserResponse.model_validate(updated_user)


@router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"نوع فایل .{ext} مجاز نیست")

    try:
        relative_url = save_upload(content, file.filename or "image.jpg", subdir="avatars")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo = UserRepository(db)
    user = await repo.get_by_id(current_user.id)
    if user:
        delete_upload(user.avatar_url)
        user.avatar_url = relative_url
        await db.flush()

    await log_action(
        db,
        current_user.id,
        "avatar_updated",
        f"تغییر تصویر پروفایل | '{current_user.full_name}'",
    )

    return AvatarUploadResponse(url=relative_url)


@router.delete("/avatar", status_code=204)
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    old_url = current_user.avatar_url
    current_user.avatar_url = None
    await db.flush()

    delete_upload(old_url)

    await log_action(
        db,
        current_user.id,
        "avatar_deleted",
        f"حذف تصویر پروفایل | '{current_user.full_name}'",
    )
