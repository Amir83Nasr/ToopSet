from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field
import enum


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
