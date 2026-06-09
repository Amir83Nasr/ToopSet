from __future__ import annotations

from datetime import datetime
import enum

from pydantic import BaseModel, Field


class UserRoleEnum(str, enum.Enum):
    USER = "user"
    MANAGER = "manager"
    ADMIN = "admin"


class UserAdminResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    users: list[UserAdminResponse]
    total: int


class UserDetailResponse(UserAdminResponse):
    pass


class UpdateUserRoleRequest(BaseModel):
    role: UserRoleEnum = Field(...)


class ToggleActiveResponse(BaseModel):
    id: int
    is_active: bool


class AdminCreateUserRequest(BaseModel):
    phone: str = Field(
        ..., min_length=11, max_length=11, pattern=r"^09\d{9}$", examples=["09120000000"]
    )
    password: str = Field(..., min_length=4, max_length=128, examples=["123456"])
    full_name: str = Field(..., min_length=1, max_length=128, examples=["کاربر جدید"])
    role: UserRoleEnum = Field(default=UserRoleEnum.USER)


class AdminCreateUserResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class DeleteUserResponse(BaseModel):
    id: int
    deleted: bool
