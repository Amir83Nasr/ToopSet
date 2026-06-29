from datetime import datetime

from pydantic import BaseModel


class SessionResponse(BaseModel):
    session_id: str
    device_info: str | None = None
    ip_address: str | None = None
    created_at: datetime | None = None
    expires_at: datetime | None = None


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    current_session_id: str | None = None


class LogoutResponse(BaseModel):
    detail: str = "با موفقیت خارج شدید"
