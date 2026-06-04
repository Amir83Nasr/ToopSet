from fastapi import HTTPException, status

from app.core.logger import log_action
from app.core.security import (
    decode_token,
    hash_password,
    tokens_for_user,
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
                status_code=status.HTTP_409_CONFLICT, detail="این شماره تلفن قبلاً ثبت‌نام کرده است"
            )

        password_hash = hash_password(password)

        # Mock SMS — log verification code to console
        print(f"[SMS Mock] Verification code for {phone}: 123456")

        user = await self.repo.create(phone=phone, password_hash=password_hash, full_name=full_name)

        await log_action(
            self.repo.db,
            user.id,
            "user_registered",
            f"ثبت‌نام کاربر | {full_name} با شماره {phone}",
        )

        access_token, refresh_token = tokens_for_user(user.id, user.role, user.token_version)

        return user, access_token, refresh_token

    async def login(self, phone: str, password: str) -> tuple[User, str, str]:
        user = await self.repo.get_by_phone(phone)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="شماره تلفن یا رمز عبور اشتباه است"
            )

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="حساب کاربری شما غیرفعال شده است")

        user.token_version += 1
        await self.repo.update_user(user.id, {"token_version": user.token_version})

        await log_action(
            self.repo.db,
            user.id,
            "user_login",
            f"ورود کاربر | '{user.full_name}' با شماره {user.phone}",
        )

        access_token, refresh_token = tokens_for_user(user.id, user.role, user.token_version)

        return user, access_token, refresh_token

    async def refresh(self, refresh_token: str) -> tuple[str, str]:
        payload = decode_token(refresh_token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن رفرش نامعتبر یا منقضی شده"
            )

        user_id = payload.get("sub")
        _ = payload.get("role")
        ver = payload.get("ver")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="محتویات توکن نامعتبر است"
            )

        user = await self.repo.get_by_id(int(user_id))
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

        # Reject refresh if token version doesn't match (logged in elsewhere)
        if ver is not None and ver != user.token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="نشست شما به پایان رسید — از دستگاه دیگری وارد شده‌اید",
            )

        access_token, refresh_token = tokens_for_user(user.id, user.role, user.token_version)

        return access_token, refresh_token

    async def update_profile(self, current_user: User, data: UpdateProfileRequest) -> User:
        update_data: dict[str, str] = {}
        changed_fields: list[str] = []

        if data.full_name is not None:
            update_data["full_name"] = data.full_name
            changed_fields.append("نام")

        if data.new_password is not None:
            if data.current_password is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="برای تغییر رمز عبور، رمز فعلی را وارد کنید",
                )
            if not verify_password(data.current_password, current_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="رمز عبور فعلی اشتباه است",
                )
            update_data["password_hash"] = hash_password(data.new_password)
            changed_fields.append("رمز عبور")

        updated_user = await self.repo.update_user(current_user.id, update_data)
        if updated_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="کاربر یافت نشد",
            )

        if changed_fields:
            await log_action(
                self.repo.db,
                current_user.id,
                "profile_updated",
                f"ویرایش پروفایل | '{current_user.full_name}' — تغییر {', '.join(changed_fields)}",
            )

        return updated_user
