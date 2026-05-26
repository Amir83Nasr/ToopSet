from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

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
