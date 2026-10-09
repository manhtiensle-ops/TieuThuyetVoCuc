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


# ── Public schema — dùng cho bất kỳ endpoint nào trả user ra ngoài ──
# Không chứa thông tin nội bộ: role, ban_reason, is_banned, is_active
class UserPublicOut(BaseModel):
    """
    Schema an toàn để trả về thông tin user ra API public.
    Chỉ chứa các field hiển thị cho mọi người dùng.
    """
    model_config = {"from_attributes": True}
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    joined_at: datetime | None = None
    novels_read: int = 0
    chapters_read: int = 0
    comments_count: int = 0


# ── Owner schema — dùng cho /me (chủ tài khoản xem chính mình) ──────
# Thêm email so với public, nhưng vẫn không có role/ban (không cần thiết ở client)
class UserMeOut(UserPublicOut):
    """
    Schema cho endpoint /me — owner xem thông tin chính mình.
    Thêm email. Không chứa role/ban_reason để tránh leak nếu token bị đánh cắp.
    """
    email: str


# ── Admin schema — chỉ dùng trong admin endpoints ────────────────────
# Full info để admin quản lý
class UserOut(UserPublicOut):
    """
    Schema đầy đủ — CHỈ dùng trong admin endpoints (require_roles='admin').
    Chứa role, is_active, is_banned, ban_reason để admin quản lý tài khoản.
    KHÔNG dùng làm response_model của bất kỳ public endpoint nào.
    """
    role: str
    is_active: bool = True
    is_banned: bool = False
    ban_reason: str | None = None
    email: str | None = None  # Admin cần email để contact/verify


class UserUpdateAdmin(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    is_banned: bool | None = None
    ban_reason: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
