from pydantic import BaseModel
from datetime import datetime

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