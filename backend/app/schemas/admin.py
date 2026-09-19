from pydantic import BaseModel
from app.schemas.user import UserOut
from app.schemas.report import ReportOut

class AdminStatsOut(BaseModel):
    total_users: int
    total_novels: int
    total_chapters: int
    total_views: int
    pending_reports: int = 0
    blocked_ips_count: int = 0

class UserListOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    per_page: int
    total_pages: int

class ReportListOut(BaseModel):
    items: list[ReportOut]
    total: int
    page: int
    per_page: int
    total_pages: int
