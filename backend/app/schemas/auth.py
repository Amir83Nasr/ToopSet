from datetime import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=16, examples=["09120000000"])
    password: str = Field(..., min_length=8, max_length=128, examples=["Str0ng!Pass"])
    full_name: str = Field(..., min_length=1, max_length=128, examples=["کاربر تست"])


class LoginRequest(BaseModel):
    phone: str = Field(..., examples=["09306853363"])
    password: str = Field(..., examples=["Amir83Nasr"])


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    role: str
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AvatarUploadResponse(BaseModel):
    url: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=128)
    current_password: str | None = Field(None, min_length=1, max_length=128)
    new_password: str | None = Field(
        None, min_length=8, max_length=128, description="Min 8 characters"
    )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse | None = None


# ── OTP schemas ──────────────────────────────────────────────────────


class SendOtpRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=16, examples=["09120000000"])


class SendOtpResponse(BaseModel):
    message: str
    is_new_user: bool
    dev_code: str | None = Field(
        None,
        min_length=6,
        max_length=6,
        description="Development-only: the OTP code. Never populated in production.",
        examples=["123456"],
    )


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=16, examples=["09120000000"])
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    full_name: str | None = Field(
        None,
        min_length=1,
        max_length=128,
        description="Required only for new users (is_new_user=true)",
        examples=["علی محمدی"],
    )
