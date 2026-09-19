from pydantic import BaseModel
from app.schemas.user import UserOut

class AdminStatsOut(BaseModel):
    total_users: int
    total_novels: int
    total_chapters: int
    total_views: int

class UserListOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    per_page: int
    total_pages: int
