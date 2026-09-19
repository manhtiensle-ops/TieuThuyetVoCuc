from pydantic import BaseModel
from datetime import datetime

class NovelCreate(BaseModel):
    title: str
    author: str
    slug: str | None = None
    description: str = ""
    cover_url: str | None = None
    status: str = "ongoing"
    genres: list[str] = []

class NovelUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    slug: str | None = None
    description: str | None = None
    cover_url: str | None = None
    status: str | None = None
    genres: list[str] | None = None

class NovelOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    slug: str
    title: str
    author: str
    cover_url: str | None
    description: str
    genres: list[str] = []
    status: str
    total_chapters: int
    views: int
    rating: float
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
