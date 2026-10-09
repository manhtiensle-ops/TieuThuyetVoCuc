import re
from pydantic import BaseModel, field_validator
from datetime import datetime

# Regex chặn path traversal và ký tự đặc biệt trong slug
_SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
_SLUG_MAX_LEN = 200

def _validate_slug(v: str | None) -> str | None:
    """
    Validator dùng chung cho slug field:
    - Chỉ cho phép [a-z0-9-], bắt đầu/kết thúc bằng chữ hoặc số
    - Tối đa 200 ký tự
    - Chặn path traversal: '../', './', '//', '%2f', '%2e'...
    - None được phép (slug tự sinh từ title)
    """
    if v is None:
        return None
    v = v.strip().lower()
    if not v:
        return None
    if len(v) > _SLUG_MAX_LEN:
        raise ValueError(f"Slug quá dài (tối đa {_SLUG_MAX_LEN} ký tự)")
    if not _SLUG_RE.match(v):
        raise ValueError(
            "Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-). "
            "Không được bắt đầu hoặc kết thúc bằng dấu gạch ngang."
        )
    return v


class NovelCreate(BaseModel):
    title: str
    author: str | None = None
    slug: str | None = None
    description: str = ""
    cover_url: str | None = None
    status: str = "ongoing"
    genres: list[str] = []
    tags: list[str] = []
    first_chapter_title: str | None = None
    first_chapter_content: str | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, v):
        return _validate_slug(v)


class NovelUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    slug: str | None = None
    description: str | None = None
    cover_url: str | None = None
    status: str | None = None
    genres: list[str] | None = None
    tags: list[str] | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, v):
        return _validate_slug(v)

class NovelOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    slug: str
    title: str
    author: str
    cover_url: str | None
    description: str
    genres: list[str] = []
    tags: list[str] = []
    status: str
    total_chapters: int
    views: int
    rating: float
    uploader_id: int | None = None
    uploader_name: str | None = None
    updated_at: datetime

class NovelListOut(BaseModel):
    items: list[NovelOut]
    total: int
    page: int
    per_page: int
    total_pages: int

class ChapterCreate(BaseModel):
    number: int
    title: str
    content: str
    is_premium: bool = False

class ChapterUpdate(BaseModel):
    number: int | None = None
    title: str | None = None
    content: str | None = None
    is_premium: bool | None = None

class ChapterMetaOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    novel_id: int
    number: int
    title: str
    is_premium: bool
    published_at: datetime

class ChapterOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    novel_id: int
    number: int
    title: str
    content: str
    word_count: int
    is_premium: bool
    published_at: datetime
    # Các field bổ sung khi chapter bị khóa với reader thường / ẩn danh
    is_locked: bool = False           # True = chỉ xem preview, cần VIP
    locked_message: str | None = None # Thông báo hiển thị cho user
