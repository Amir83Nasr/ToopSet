from pydantic import BaseModel, EmailStr, Field


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    email: str  # string-only, no EmailStr to simplify
    phone: str | None = Field(None, max_length=32)
    subject: str = Field(..., min_length=1, max_length=512)
    message: str = Field(..., min_length=1)


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    subject: str
    message: str
    created_at: str

    model_config = {"from_attributes": True}
