from pydantic import BaseModel
from datetime import datetime

class ReportCreate(BaseModel):
    reason: str
    details: str

class ReportActionRequest(BaseModel):
    action: str  # "delete_novel", "ban_user", "block_ip", "dismiss"
    notes: str | None = None

class ReportOut(BaseModel):
    id: int
    novel_id: int
    novel_title: str
    novel_slug: str
    novel_cover_url: str | None = None
    uploader_id: int | None = None
    uploader_name: str | None = None
    uploader_ip: str | None = None
    reporter_id: int | None = None
    reporter_name: str | None = None
    reporter_ip: str | None = None
    reason: str
    details: str
    status: str
    admin_action: str | None = None
    admin_notes: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None

class BlockedIPCreate(BaseModel):
    ip_address: str
    reason: str

class BlockedIPOut(BaseModel):
    id: int
    ip_address: str
    reason: str
    created_at: datetime
    blocked_by_id: int | None = None
    blocked_by_name: str | None = None
