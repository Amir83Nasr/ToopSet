from datetime import datetime

from pydantic import BaseModel, Field, computed_field, field_validator

from app.core.phone import normalize_phone
from app.repositories.user_repo import OTP_PLACEHOLDER_HASH


class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, examples=["09120000000"])
    password: str = Field(..., min_length=8, max_length=128, examples=["Str0ng!Pass"])
    full_name: str = Field(..., min_length=1, max_length=128, examples=["کاربر تست"])

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str) -> str:
        return normalize_phone(value)


class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, examples=["09306853363"])
    password: str = Field(..., examples=["Amir83Nasr"])

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str) -> str:
        return normalize_phone(value)


class LoginOptionsRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, examples=["09306853363"])

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str) -> str:
        return normalize_phone(value)


class LoginOptionsResponse(BaseModel):
    is_new_user: bool
    has_password: bool


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class UserResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    role: str
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime | None = None
    password_hash: str | None = Field(None, exclude=True)

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def has_password(self) -> bool:
        return bool(self.password_hash and self.password_hash != OTP_PLACEHOLDER_HASH)


class AvatarUploadResponse(BaseModel):
    url: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=128)
    phone: str | None = Field(None, min_length=11, max_length=11, examples=["09120000000"])
    new_password: str | None = Field(
        None, min_length=8, max_length=128, description="Min 8 characters"
    )
    current_password: str | None = Field(None, min_length=1, max_length=128)

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_phone(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse | None = None


# ── OTP schemas ──────────────────────────────────────────────────────


class SendOtpRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, examples=["09120000000"])

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str) -> str:
        return normalize_phone(value)


class SendOtpResponse(BaseModel):
    message: str
    is_new_user: bool
    expires_in: int = Field(..., ge=0, description="Remaining OTP lifetime in seconds.")
    has_password: bool = Field(
        False,
        description="True when the phone belongs to an existing password-enabled user.",
    )
    dev_code: str | None = Field(
        None,
        min_length=6,
        max_length=6,
        description="Development-only: the OTP code. Never populated in production.",
        examples=["123456"],
    )


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, examples=["09120000000"])
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    purpose: str = Field("login", pattern="^(login|password_reset)$")
    full_name: str | None = Field(
        None,
        min_length=1,
        max_length=128,
        description="Required only for new users (is_new_user=true)",
        examples=["علی محمدی"],
    )

    @field_validator("phone")
    @classmethod
    def normalize_phone_field(cls, value: str) -> str:
        return normalize_phone(value)
