from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    display_name: str
    avatar_url: str | None
    bio: str | None
    role: str
    is_active: bool = True
    joined_at: datetime | None = None
    novels_read: int = 0
    chapters_read: int = 0
    comments_count: int = 0

class UserUpdateAdmin(BaseModel):
    role: str | None = None
    is_active: bool | None = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
