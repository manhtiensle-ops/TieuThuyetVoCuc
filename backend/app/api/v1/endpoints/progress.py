"""
progress.py — Reading Progress API

PUT  /api/v1/progress          — upsert vị trí đọc (chapter + scroll%)
GET  /api/v1/progress/{slug}   — lấy vị trí đọc dở của user cho 1 novel
GET  /api/v1/progress          — lấy toàn bộ history (danh sách đang đọc dở)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.reading_history import ReadingHistory

router = APIRouter(prefix="/progress", tags=["progress"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProgressUpsert(BaseModel):
    novel_slug: str
    chapter_number: int = Field(..., ge=1)
    scroll_pct: float   = Field(..., ge=0.0, le=1.0)


class ProgressOut(BaseModel):
    novel_slug: str
    novel_title: str
    cover_url: str | None
    chapter_number: int
    chapter_title: str | None
    scroll_pct: float
    read_at: datetime

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_novel_chapter(
    db: AsyncSession, novel_slug: str, chapter_number: int
) -> tuple[Novel, Chapter]:
    novel_result = await db.execute(select(Novel).where(Novel.slug == novel_slug))
    novel = novel_result.scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    chapter_result = await db.execute(
        select(Chapter).where(Chapter.novel_id == novel.id, Chapter.number == chapter_number)
    )
    chapter = chapter_result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương")

    return novel, chapter


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.put("", status_code=200)
async def upsert_progress(
    body: ProgressUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lưu / cập nhật vị trí đọc dở.
    Gọi từ frontend mỗi khi: chuyển chương, hoặc debounce scroll 3s.
    Dùng PostgreSQL ON CONFLICT DO UPDATE để atomic upsert.
    """
    novel, chapter = await _resolve_novel_chapter(db, body.novel_slug, body.chapter_number)

    stmt = (
        pg_insert(ReadingHistory)
        .values(
            user_id=current_user.id,
            novel_id=novel.id,
            last_chapter_id=chapter.id,
            last_chapter_num=body.chapter_number,
            scroll_pct=body.scroll_pct,
            read_at=datetime.now(timezone.utc),
        )
        .on_conflict_do_update(
            constraint="uq_reading_history_user_novel",
            set_={
                "last_chapter_id":  chapter.id,
                "last_chapter_num": body.chapter_number,
                "scroll_pct":       body.scroll_pct,
                "read_at":          datetime.now(timezone.utc),
            },
        )
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.get("/{novel_slug}", response_model=ProgressOut)
async def get_progress(
    novel_slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy vị trí đọc dở của user cho 1 novel cụ thể.
    Frontend dùng để hiện nút "Đọc tiếp chương X" và restore scroll.
    """
    result = await db.execute(
        select(ReadingHistory, Novel, Chapter)
        .join(Novel, Novel.id == ReadingHistory.novel_id)
        .outerjoin(Chapter, Chapter.id == ReadingHistory.last_chapter_id)
        .where(ReadingHistory.user_id == current_user.id, Novel.slug == novel_slug)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Chưa có lịch sử đọc cho truyện này")

    history, novel, chapter = row
    return ProgressOut(
        novel_slug=novel.slug,
        novel_title=novel.title,
        cover_url=novel.cover_url,
        chapter_number=history.last_chapter_num,
        chapter_title=chapter.title if chapter else None,
        scroll_pct=history.scroll_pct,
        read_at=history.read_at,
    )


@router.get("", response_model=list[ProgressOut])
async def list_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Danh sách tất cả truyện đang đọc dở, sắp xếp theo lần đọc gần nhất.
    Dùng cho trang 'Tủ sách / Đang đọc'.
    """
    result = await db.execute(
        select(ReadingHistory, Novel, Chapter)
        .join(Novel, Novel.id == ReadingHistory.novel_id)
        .outerjoin(Chapter, Chapter.id == ReadingHistory.last_chapter_id)
        .where(ReadingHistory.user_id == current_user.id)
        .order_by(ReadingHistory.read_at.desc())
        .limit(50)
    )
    rows = result.all()
    return [
        ProgressOut(
            novel_slug=novel.slug,
            novel_title=novel.title,
            cover_url=novel.cover_url,
            chapter_number=history.last_chapter_num,
            chapter_title=chapter.title if chapter else None,
            scroll_pct=history.scroll_pct,
            read_at=history.read_at,
        )
        for history, novel, chapter in rows
    ]
