"""
dashboard.py — Author Dashboard Analytics

Endpoints (tất cả yêu cầu role admin | editor | author):
  GET /dashboard/novels/{novel_id}/stats      — Tổng lượt đọc, chương nhiều nhất
  GET /dashboard/novels/{novel_id}/daily      — Lượt đọc theo ngày (30 ngày gần nhất)
  GET /dashboard/novels/{novel_id}/chapters   — Lượt đọc + drop-off theo chương
  GET /dashboard/overview                     — Tổng quan tất cả novel của user

Cách tính drop-off:
  - chapter_readers[n] = số user đọc đến chương n (last_chapter_num >= n)
  - drop_off[n] = (chapter_readers[n-1] - chapter_readers[n]) / chapter_readers[1] * 100
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, Integer, cast
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.novel import Novel
from app.models.reading_history import ReadingHistory
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ALLOWED_ROLES = {"admin", "editor"}

# Novel_id → kiểm tra ownership cho editor (admin xem được tất cả)
async def _require_dashboard_and_check_novel(
    novel_id: int,
    current_user: User,
    db: AsyncSession,
) -> Novel:
    """Auth check + ownership: admin thấy mọi novel, editor chỉ thấy novel của mình."""
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin hoặc editor mới có thể xem dashboard.",
        )
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện.")
    # IDOR guard: editor chỉ xem novel của mình
    if current_user.role == "editor" and novel.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem dashboard của truyện này.",
        )
    return novel


def _require_dashboard(current_user: User) -> User:
    """Dùng cho /overview — không cần novel_id."""
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin hoặc editor mới có thể xem dashboard.",
        )
    return current_user


async def _get_novel(novel_id: int, db: AsyncSession) -> Novel:
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện.")
    return novel


# ── 1. Tổng quan một novel ───────────────────────────────────
@router.get("/novels/{novel_id}/stats")
async def novel_stats(
    novel_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard(current_user)
    novel = await _require_dashboard_and_check_novel(novel_id, current_user, db)
    total_readers = await db.scalar(
        select(func.count(ReadingHistory.id))
        .where(ReadingHistory.novel_id == novel_id)
    ) or 0

    # Chương xa nhất có người đọc (avg completion)
    avg_chapter = await db.scalar(
        select(func.avg(cast(ReadingHistory.last_chapter_num, Integer)))
        .where(ReadingHistory.novel_id == novel_id)
    )

    max_chapter = await db.scalar(
        select(func.max(ReadingHistory.last_chapter_num))
        .where(ReadingHistory.novel_id == novel_id)
    ) or 0

    # Đọc trong 7 ngày gần nhất
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)
    readers_7d = await db.scalar(
        select(func.count(ReadingHistory.id))
        .where(
            ReadingHistory.novel_id == novel_id,
            ReadingHistory.read_at >= since_7d,
        )
    ) or 0

    return {
        "novel_id":       novel_id,
        "novel_title":    novel.title,
        "total_readers":  total_readers,
        "avg_chapter":    round(float(avg_chapter or 0), 1),
        "max_chapter_reached": max_chapter,
        "readers_last_7d": readers_7d,
    }


# ── 2. Lượt đọc theo ngày (30 ngày) ─────────────────────────
@router.get("/novels/{novel_id}/daily")
async def novel_daily(
    novel_id: int,
    days: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard(current_user)
    novel = await _require_dashboard_and_check_novel(novel_id, current_user, db)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Group by date — dùng literal_column để tránh asyncpg bind parameter hóa 'day'
    from sqlalchemy import literal_column, text as sa_text
    day_expr = literal_column("DATE_TRUNC('day', reading_history.read_at)")

    rows = (await db.execute(
        select(
            day_expr.label("day"),
            func.count(ReadingHistory.id).label("readers"),
        )
        .where(
            ReadingHistory.novel_id == novel_id,
            ReadingHistory.read_at >= since,
        )
        .group_by(day_expr)
        .order_by(day_expr)
    )).all()

    return {
        "novel_id": novel_id,
        "days":     days,
        "series": [
            {"date": str(r.day.date()), "readers": r.readers}
            for r in rows
        ],
    }


# ── 3. Drop-off theo chương ──────────────────────────────────
@router.get("/novels/{novel_id}/chapters")
async def novel_chapter_dropoff(
    novel_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard(current_user)
    novel = await _require_dashboard_and_check_novel(novel_id, current_user, db)

    # Số reader đọc đến >= chapter n → phân phối tích lũy
    rows = (await db.execute(
        select(
            ReadingHistory.last_chapter_num.label("chapter"),
            func.count(ReadingHistory.id).label("readers_at"),
        )
        .where(ReadingHistory.novel_id == novel_id)
        .group_by(ReadingHistory.last_chapter_num)
        .order_by(ReadingHistory.last_chapter_num)
    )).all()

    if not rows:
        return {"novel_id": novel_id, "chapters": []}

    # Build cumulative: readers_reached[n] = sum(readers_at >= n)
    # Dùng suffix sum
    chapter_data: dict[int, int] = {r.chapter: r.readers_at for r in rows}
    max_ch = max(chapter_data.keys())
    total_ch1_readers = sum(v for k, v in chapter_data.items())

    cumulative = {}
    running = 0
    for ch in range(max_ch, 0, -1):
        running += chapter_data.get(ch, 0)
        cumulative[ch] = running

    result = []
    for ch in range(1, max_ch + 1):
        reached = cumulative.get(ch, 0)
        drop_pct = 0.0
        if ch > 1 and total_ch1_readers > 0:
            prev = cumulative.get(ch - 1, 0)
            drop_pct = round((prev - reached) / total_ch1_readers * 100, 1) if prev > 0 else 0.0
        result.append({
            "chapter":        ch,
            "readers_reached": reached,
            "drop_off_pct":   drop_pct,
        })

    return {"novel_id": novel_id, "chapters": result}


# ── 4. Overview tất cả novel ─────────────────────────────────
@router.get("/overview")
async def dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard(current_user)

    # Tổng readers mỗi novel
    rows = (await db.execute(
        select(
            Novel.id,
            Novel.title,
            Novel.slug,
            func.count(ReadingHistory.id).label("total_readers"),
            func.max(ReadingHistory.read_at).label("last_read"),
        )
        .outerjoin(ReadingHistory, ReadingHistory.novel_id == Novel.id)
        .group_by(Novel.id, Novel.title, Novel.slug)
        .order_by(func.count(ReadingHistory.id).desc())
        .limit(20)
    )).all()

    since_7d = datetime.now(timezone.utc) - timedelta(days=7)
    total_readers_7d = await db.scalar(
        select(func.count(ReadingHistory.id))
        .where(ReadingHistory.read_at >= since_7d)
    ) or 0

    return {
        "total_readers_last_7d": total_readers_7d,
        "novels": [
            {
                "novel_id":      r.id,
                "title":         r.title,
                "slug":          r.slug,
                "total_readers": r.total_readers,
                "last_read":     str(r.last_read) if r.last_read else None,
            }
            for r in rows
        ],
    }
