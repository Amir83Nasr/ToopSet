from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import log_action
from app.core.security import (
    decode_token,
    hash_password,
    hash_token,
    tokens_for_user,
    verify_password,
)
from app.models.user import User
from app.repositories.refresh_token_repo import RefreshTokenRepo
from app.repositories.user_repo import UserRepository

SECURITY_LOG_EVENTS = True


async def _security_log(
    db: AsyncSession, user_id: int | None, action: str, details: str | None = None
) -> None:
    """Write a structured security audit log entry."""
    if SECURITY_LOG_EVENTS:
        await log_action(db, user_id, action, details)


class AuthService:
    def __init__(self, repo: UserRepository, refresh_repo: RefreshTokenRepo | None = None):
        self.repo = repo
        self._refresh_repo = refresh_repo

    @property
    def refresh_repo(self) -> RefreshTokenRepo:
        if self._refresh_repo is None:
            self._refresh_repo = RefreshTokenRepo(self.repo.db)
        return self._refresh_repo

    # ── Register ─────────────────────────────────────────────────────

    async def register(
        self,
        phone: str,
        password: str,
        full_name: str,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, str, str]:
        existing = await self.repo.get_by_phone(phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="این شماره تلفن قبلاً ثبت‌نام کرده است"
            )

        password_hash = hash_password(password)
        user = await self.repo.create(phone=phone, password_hash=password_hash, full_name=full_name)

        access_token, refresh_token = tokens_for_user(user.id, user.role, user.token_version)

        # Persist the refresh token
        await self._persist_refresh_token(
            user_id=user.id,
            refresh_token=refresh_token,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await _security_log(
            self.repo.db,
            user.id,
            "user_registered",
            f"ثبت‌نام کاربر | {full_name} با شماره {phone}",
        )

        return user, access_token, refresh_token

    # ── Login ─────────────────────────────────────────────────────────

    async def login(
        self,
        phone: str,
        password: str,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, str, str]:
        user = await self.repo.get_by_phone(phone)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="شماره تلفن یا رمز عبور اشتباه است"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="حساب کاربری شما غیرفعال شده است"
            )

        user.token_version += 1
        await self.repo.update_user(user.id, {"token_version": user.token_version})

        access_token, refresh_token = tokens_for_user(user.id, user.role, user.token_version)
        session_id = self._extract_session_id(refresh_token)

        # Persist the refresh token
        await self._persist_refresh_token(
            user_id=user.id,
            refresh_token=refresh_token,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await _security_log(
            self.repo.db,
            user.id,
            "user_login",
            f"ورود کاربر | '{user.full_name}' با شماره {user.phone} | نشست {session_id[:8]}...",
        )

        return user, access_token, refresh_token

    # ── Refresh (with rotation + replay detection) ───────────────────

    async def refresh(
        self,
        refresh_token: str,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[str, str]:
        payload = decode_token(refresh_token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن رفرش نامعتبر یا منقضی شده"
            )

        # Validate token type
        token_type = payload.get("type")
        if token_type is not None and token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="نوع توکن نامعتبر است"
            )

        user_id = payload.get("sub")
        _role = payload.get("role")
        ver = payload.get("ver")
        session_id = payload.get("sid")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="محتویات توکن نامعتبر است"
            )

        user = await self.repo.get_by_id(int(user_id))
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

        # Reject refresh if token version doesn't match
        if ver is not None and ver != user.token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="نشست شما به پایان رسید — از دستگاه دیگری وارد شده‌اید",
            )

        # ── Refresh rotation flow ────────────────────────────────────
        token_hash = hash_token(refresh_token)
        stored = await self.refresh_repo.get_by_hash(token_hash)

        if stored is None or stored.revoked_at is not None:
            # Replay attack or already-used token
            if stored is not None and stored.revoked_at is not None:
                # Replay detected — revoke all sessions for this user
                await self.refresh_repo.revoke_all_for_user(user.id)
                # Bump token version to invalidate all JWTs
                user.token_version += 1
                await self.repo.update_user(user.id, {"token_version": user.token_version})
                await _security_log(
                    self.repo.db,
                    user.id,
                    "token_replay_detected",
                    f"تلاش استفاده مجدد از توکن رفرش | نشست {session_id[:8] if session_id else '?'}... | همه نشست‌ها لغو شد",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="نشست شما به پایان رسید — لطفاً دوباره وارد شوید",
            )

        # ── Revoke old token, issue new pair ─────────────────────────
        await self.refresh_repo.revoke(stored.id)

        if session_id is None:
            # Legacy token without sid — generate new session
            session_id = None  # tokens_for_user will generate one

        access_token, new_refresh_token = tokens_for_user(
            user.id, user.role, user.token_version, session_id=session_id
        )
        new_hash = hash_token(new_refresh_token)

        # Mark old token as replaced
        stored.replaced_by = new_hash
        await self.refresh_repo.db.flush()

        # Persist new refresh token
        await self._persist_refresh_token(
            user_id=user.id,
            refresh_token=new_refresh_token,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        actual_sid = self._extract_session_id(new_refresh_token)
        await _security_log(
            self.repo.db,
            user.id,
            "token_refresh",
            f"توکن رفرش تازه شد | نشست {actual_sid[:8]}...",
        )

        return access_token, new_refresh_token

    # ── Logout ───────────────────────────────────────────────────────

    async def logout(self, current_user: User, refresh_token: str | None = None) -> None:
        """Revoke the current session."""
        if refresh_token:
            payload = decode_token(refresh_token)
            session_id = payload.get("sid") if payload else None
            if session_id:
                await self.refresh_repo.revoke_all_for_session(session_id, user_id=current_user.id)
                await _security_log(
                    self.repo.db,
                    current_user.id,
                    "user_logout",
                    f"خروج از حساب | نشست {session_id[:8]}...",
                )
                return

        # Fallback: no valid refresh token — revoke all sessions anyway
        count = await self.refresh_repo.revoke_all_for_user(current_user.id)
        await _security_log(
            self.repo.db,
            current_user.id,
            "user_logout",
            f"خروج از حساب | {count} نشست لغو شد",
        )

    async def logout_all_sessions(self, current_user: User) -> int:
        """Revoke all sessions and bump token_version. Returns count."""
        # Revoke all tokens in DB
        count = await self.refresh_repo.revoke_all_for_user(current_user.id)
        # Bump token_version to invalidate all JWTs
        current_user.token_version += 1
        await self.repo.update_user(current_user.id, {"token_version": current_user.token_version})
        await _security_log(
            self.repo.db,
            current_user.id,
            "user_logout_all",
            f"خروج از تمام نشست‌ها | {count} نشست لغو شد",
        )
        return count

    # ── Session management ───────────────────────────────────────────

    async def list_sessions(self, current_user: User) -> list[dict]:
        """Return active sessions for the user."""
        tokens = await self.refresh_repo.get_active_sessions(current_user.id)
        return [
            {
                "session_id": t.session_id,
                "device_info": t.device_info,
                "ip_address": t.ip_address,
                "created_at": t.issued_at,
                "expires_at": t.expires_at,
            }
            for t in tokens
        ]

    async def revoke_session(self, current_user: User, session_id: str) -> bool:
        """Revoke a specific session. Returns True if anything was revoked."""
        count = await self.refresh_repo.revoke_all_for_session(session_id, user_id=current_user.id)
        if count:
            await _security_log(
                self.repo.db,
                current_user.id,
                "session_revoked",
                f"نشست لغو شد | {session_id[:8]}...",
            )
        return count > 0

    async def admin_revoke_user_sessions(
        self, db: AsyncSession, admin_user: User, target_user_id: int
    ) -> int:
        """Admin revokes all sessions for another user. Returns count."""
        target_user = await self.repo.get_by_id(target_user_id)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

        count = await self.refresh_repo.revoke_all_for_user(target_user_id)
        # Bump their token_version
        target_user.token_version += 1
        await self.repo.update_user(target_user_id, {"token_version": target_user.token_version})

        await _security_log(
            db,
            admin_user.id,
            "admin_session_revoke",
            f"لغو نشست توسط ادمین | کاربر {target_user.full_name} (id={target_user_id}) | {count} نشست لغو شد",
        )
        return count

    # ── Profile update ───────────────────────────────────────────────

    async def update_profile(self, current_user: User, data) -> User:
        from app.schemas.auth import UpdateProfileRequest

        if not isinstance(data, UpdateProfileRequest):
            raise HTTPException(status_code=400, detail="اطلاعات نامعتبر")

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
            await _security_log(
                self.repo.db,
                current_user.id,
                "profile_updated",
                f"ویرایش پروفایل | '{current_user.full_name}' — تغییر {', '.join(changed_fields)}",
            )

        return updated_user

    # ── Internal helpers ─────────────────────────────────────────────

    async def _persist_refresh_token(
        self,
        user_id: int,
        refresh_token: str,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        payload = decode_token(refresh_token)
        if payload is None:
            return
        session_id = payload.get("sid") or ""
        exp = payload.get("exp")
        from datetime import datetime, timezone

        expires_at = (
            datetime.fromtimestamp(exp, tz=timezone.utc) if exp else datetime.now(timezone.utc)
        )
        await self.refresh_repo.create(
            token_hash=hash_token(refresh_token),
            user_id=user_id,
            session_id=session_id,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @staticmethod
    def _extract_session_id(refresh_token: str) -> str:
        """Extract the ``sid`` claim from a refresh token."""
        payload = decode_token(refresh_token)
        if payload:
            return payload.get("sid", "")
        return ""
