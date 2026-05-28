from fastapi import HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import UpdateProfileRequest


class AuthService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def register(self, phone: str, password: str, full_name: str) -> tuple[User, str, str]:
        existing = await self.repo.get_by_phone(phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Phone already registered"
            )

        password_hash = hash_password(password)

        # Mock SMS — log verification code to console
        print(f"[SMS Mock] Verification code for {phone}: 123456")

        user = await self.repo.create(phone=phone, password_hash=password_hash, full_name=full_name)

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

        return user, access_token, refresh_token

    async def login(self, phone: str, password: str) -> tuple[User, str, str]:
        user = await self.repo.get_by_phone(phone)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password"
            )

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

        return user, access_token, refresh_token

    async def refresh(self, refresh_token: str) -> tuple[str, str]:
        payload = decode_token(refresh_token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
            )

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
            )

        new_access = create_access_token({"sub": user_id, "role": role})
        new_refresh = create_refresh_token({"sub": user_id, "role": role})

        return new_access, new_refresh

    async def update_profile(self, current_user: User, data: UpdateProfileRequest) -> User:
        update_data: dict[str, str] = {}

        if data.full_name is not None:
            update_data["full_name"] = data.full_name

        if data.new_password is not None:
            if data.current_password is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="current_password is required to set a new password",
                )
            if not verify_password(data.current_password, current_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect",
                )
            update_data["password_hash"] = hash_password(data.new_password)

        updated_user = await self.repo.update_user(current_user.id, update_data)
        if updated_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return updated_user
