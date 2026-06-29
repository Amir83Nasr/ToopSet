import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    email: str | None = Field(None, max_length=256)
    phone: str = Field(..., min_length=1, max_length=32)
    subject: str = Field(..., min_length=1, max_length=512)
    message: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is not None and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("فرمت ایمیل معتبر نیست")
            return v.strip()
        return None


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str
    subject: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
