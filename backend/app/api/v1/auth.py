from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.logger import log_action
from app.core.rate_limiter import limiter
from app.core.redis_client import get_redis
from app.core.security import create_password_reset_token, decode_token
from app.core.upload import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, delete_upload, save_upload
from app.models.user import User
from app.repositories.refresh_token_repo import RefreshTokenRepo
from app.repositories.user_repo import OTP_PLACEHOLDER_HASH, UserRepository
from app.schemas.auth import (
    AvatarUploadResponse,
    LoginOptionsRequest,
    LoginOptionsResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SendOtpRequest,
    SendOtpResponse,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.schemas.session import LogoutResponse, SessionListResponse, SessionResponse
from app.services.auth_service import AuthService
from app.services.otp_service import OtpService

router = APIRouter(prefix="/auth", tags=["auth"])
PASSWORD_RESET_COOKIE = "password_reset_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/api/v1/auth",
        samesite=settings.refresh_cookie_samesite,
        secure=settings.refresh_cookie_secure,
        httponly=True,
    )


def _clear_refresh_cookie_headers() -> dict[str, str]:
    response = Response()
    _clear_refresh_cookie(response)
    return {"Set-Cookie": response.headers["set-cookie"]}


def _invalid_refresh_exception(detail: str = "توکن رفرش نامعتبر یا منقضی شده") -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers=_clear_refresh_cookie_headers(),
    )


def _set_password_reset_cookie(response: Response, reset_token: str) -> None:
    response.set_cookie(
        key=PASSWORD_RESET_COOKIE,
        value=reset_token,
        max_age=10 * 60,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        path="/api/v1/auth",
    )


def _clear_password_reset_cookie(response: Response) -> None:
    response.delete_cookie(
        key=PASSWORD_RESET_COOKIE,
        path="/api/v1/auth",
        samesite=settings.refresh_cookie_samesite,
        secure=settings.refresh_cookie_secure,
        httponly=True,
    )


def _refresh_token_from_request(request: Request, body: RefreshRequest | None = None) -> str | None:
    if body and body.refresh_token:
        return body.refresh_token
    return request.cookies.get(settings.refresh_cookie_name)


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    repo = UserRepository(db)
    refresh_repo = RefreshTokenRepo(db)
    return AuthService(repo, refresh_repo)


# ── OTP endpoints ────────────────────────────────────────────────────


async def _otp_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> OtpService:
    return OtpService(UserRepository(db), redis)


@router.post("/otp/send", response_model=SendOtpResponse, summary="Send OTP code")
@limiter.limit("30/minute")
async def send_otp(
    request: Request,
    body: SendOtpRequest,
    service: OtpService = Depends(_otp_service),
):
    """Send a 6-digit verification code to the given phone number."""
    result = await service.send_otp(body.phone)
    if settings.sms_provider == "mock":
        result["dev_code"] = result.pop("code")
    return result


@router.post("/otp/verify", response_model=TokenResponse, summary="Verify OTP and login/register")
@limiter.limit("10/minute")
async def verify_otp(
    request: Request,
    response: Response,
    body: VerifyOtpRequest,
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    """Verify the OTP code. Creates account if new, logs in if existing."""
    service = OtpService(UserRepository(db), redis)
    user, access_token, refresh_token = await service.verify_otp(
        phone=body.phone,
        code=body.code,
        full_name=body.full_name,
    )
    # Persist refresh token from OTP login
    auth_service = _auth_service(db)
    await auth_service._persist_refresh_token(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=_device_info(request),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_refresh_cookie(response, refresh_token)
    if body.purpose == "password_reset":
        _set_password_reset_cookie(
            response,
            create_password_reset_token({"sub": str(user.id), "ver": user.token_version}),
        )
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# ── Password-based endpoints ─────────────────────────────────────────


@router.post(
    "/login/options",
    response_model=LoginOptionsResponse,
    summary="Check login options for a phone number",
)
@limiter.limit("10/minute")
async def login_options(
    request: Request,
    body: LoginOptionsRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await UserRepository(db).get_by_phone(body.phone)
    return LoginOptionsResponse(
        is_new_user=user is None,
        has_password=bool(user and user.password_hash != OTP_PLACEHOLDER_HASH),
    )


@router.post(
    "/register", response_model=TokenResponse, status_code=201, summary="Register a new user"
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    service: AuthService = Depends(_auth_service),
):
    user, access_token, refresh_token = await service.register(
        phone=body.phone,
        password=body.password,
        full_name=body.full_name,
        device_info=_device_info(request),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse, summary="Login user")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    service: AuthService = Depends(_auth_service),
):
    user, access_token, refresh_token = await service.login(
        phone=body.phone,
        password=body.password,
        device_info=_device_info(request),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    service: AuthService = Depends(_auth_service),
):
    refresh_token = _refresh_token_from_request(request, body)
    if not refresh_token:
        raise _invalid_refresh_exception()
    try:
        new_access, new_refresh = await service.refresh(
            refresh_token,
            device_info=_device_info(request),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except HTTPException as exc:
        if exc.status_code == 401:
            exc.headers = {
                **(exc.headers or {}),
                **_clear_refresh_cookie_headers(),
            }
        raise
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(
        access_token=new_access,
    )


# ── Profile endpoints ────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse, summary="Get current user info")
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/profile", response_model=UserResponse, summary="Update profile")
async def update_profile(
    request: Request,
    response: Response,
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    password_reset_verified = False
    reset_token = request.cookies.get(PASSWORD_RESET_COOKIE)
    if reset_token:
        reset_payload = decode_token(reset_token, expected_type="password_reset")
        password_reset_verified = bool(
            reset_payload
            and reset_payload.get("sub") == str(current_user.id)
            and reset_payload.get("ver") == current_user.token_version
        )

    updated_user = await service.update_profile(
        current_user,
        body,
        password_change_verified=password_reset_verified,
    )
    if body.new_password is not None:
        _clear_password_reset_cookie(response)
    return UserResponse.model_validate(updated_user)


@router.post("/avatar", response_model=AvatarUploadResponse, summary="Upload avatar")
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


@router.delete("/avatar", status_code=204, summary="Delete avatar")
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


# ── Session management ───────────────────────────────────────────────


@router.get("/sessions", response_model=SessionListResponse, summary="List active sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    sessions = await service.list_sessions(current_user)
    # Determine current session from the latest refresh token
    current_session_id = None
    if sessions:
        current_session_id = sessions[0]["session_id"]
    return SessionListResponse(
        sessions=[SessionResponse(**s) for s in sessions],
        current_session_id=current_session_id,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=204,
    summary="Revoke a specific session",
)
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    revoked = await service.revoke_session(current_user, session_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="نشست یافت نشد")


@router.delete(
    "/sessions",
    status_code=200,
    response_model=LogoutResponse,
    summary="Logout all sessions",
)
async def logout_all_sessions(
    response: Response,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    await service.logout_all_sessions(current_user)
    _clear_refresh_cookie(response)
    return LogoutResponse(detail="از تمام نشست‌ها خارج شدید")


@router.post("/logout", response_model=LogoutResponse, summary="Logout current session")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
):
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    await service.logout(current_user, refresh_token)
    _clear_refresh_cookie(response)
    return LogoutResponse()


# ── Helpers ──────────────────────────────────────────────────────────


def _device_info(request: Request) -> str | None:
    """Extract a short device description from the request."""
    ua = request.headers.get("user-agent", "")
    if ua:
        # Truncate to first 120 chars for storage
        return ua[:120]
    return None
