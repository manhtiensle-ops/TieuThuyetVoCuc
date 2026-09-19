import re
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.novel import Novel, NovelGenre
from app.models.chapter import Chapter
from app.schemas.user import UserOut, UserUpdateAdmin
from app.schemas.novel import (
    NovelOut,
    NovelCreate,
    NovelUpdate,
    ChapterOut,
    ChapterCreate,
    ChapterUpdate,
)
from app.schemas.admin import AdminStatsOut, UserListOut
from app.core.deps import require_roles
from app.core.text import normalize_text, remove_diacritics
from app.services.ingestion import sync_folder_to_db, export_db_to_folder
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[5] / "data" / "novels"

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles("admin", "editor"))],
)

def _slugify(text: str) -> str:
    cleaned = remove_diacritics(text)
    slug = re.sub(r"[^\w\s-]", "", cleaned).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)

def _serialize_novel(novel: Novel) -> dict:
    return {
        "id": novel.id,
        "slug": novel.slug,
        "title": normalize_text(novel.title),
        "author": normalize_text(novel.author),
        "cover_url": novel.cover_url,
        "description": normalize_text(novel.description),
        "genres": [normalize_text(g.genre) for g in novel.genres],
        "status": novel.status,
        "total_chapters": novel.total_chapters,
        "views": novel.views,
        "rating": novel.rating,
        "updated_at": novel.updated_at,
    }

# ── Stats ─────────────────────────────────────────────────────────────
@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    total_users = (await db.scalar(select(func.count(User.id)))) or 0
    total_novels = (await db.scalar(select(func.count(Novel.id)))) or 0
    total_chapters = (await db.scalar(select(func.count(Chapter.id)))) or 0
    total_views = (await db.scalar(select(func.sum(Novel.views)))) or 0
    return AdminStatsOut(
        total_users=total_users,
        total_novels=total_novels,
        total_chapters=total_chapters,
        total_views=int(total_views),
    )

# ── User Management ───────────────────────────────────────────────────
@router.get("/users", response_model=UserListOut, dependencies=[Depends(require_roles("admin"))])
async def list_users_admin(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=50),
    role: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        stmt = stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))

    count_stmt = select(func.count(User.id))
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if q:
        count_stmt = count_stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))

    total = (await db.scalar(count_stmt)) or 0
    users = (await db.execute(stmt.order_by(User.id.desc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()

    return UserListOut(
        items=users,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total else 1,
    )

@router.patch("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_roles("admin"))])
async def update_user_admin(
    user_id: int,
    body: UserUpdateAdmin,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if body.role is not None:
        if body.role not in ["admin", "editor", "vip", "reader"]:
            raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")
        user.role = body.role

    if body.is_active is not None:
        user.is_active = body.is_active

    await db.flush()
    return user

# ── Novel Management ──────────────────────────────────────────────────
@router.post("/novels", response_model=NovelOut, status_code=201)
async def create_novel(
    body: NovelCreate,
    db: AsyncSession = Depends(get_db),
):
    slug = body.slug or _slugify(body.title)
    # Check slug collision
    existing = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if existing:
        slug = f"{slug}-{int(func.extract('epoch', func.now()))}"

    novel = Novel(
        slug=slug,
        title=normalize_text(body.title),
        author=normalize_text(body.author),
        description=normalize_text(body.description),
        cover_url=body.cover_url,
        status=body.status,
        total_chapters=0,
    )
    db.add(novel)
    await db.flush()

    for genre in body.genres:
        clean_g = normalize_text(genre).strip()
        if clean_g:
            db.add(NovelGenre(novel_id=novel.id, genre=clean_g))

    await db.flush()
    await db.refresh(novel, ["genres"])
    return NovelOut.model_validate(_serialize_novel(novel))

@router.put("/novels/{novel_id}", response_model=NovelOut)
async def update_novel(
    novel_id: int,
    body: NovelUpdate,
    db: AsyncSession = Depends(get_db),
):
    novel = (
        await db.execute(select(Novel).options(selectinload(Novel.genres)).where(Novel.id == novel_id))
    ).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    if body.title is not None:
        novel.title = normalize_text(body.title)
    if body.author is not None:
        novel.author = normalize_text(body.author)
    if body.slug is not None:
        novel.slug = _slugify(body.slug)
    if body.description is not None:
        novel.description = normalize_text(body.description)
    if body.cover_url is not None:
        novel.cover_url = body.cover_url
    if body.status is not None:
        novel.status = body.status

    if body.genres is not None:
        # Xóa genres cũ và gán mới
        await db.execute(delete(NovelGenre).where(NovelGenre.novel_id == novel.id))
        for g in body.genres:
            clean_g = normalize_text(g).strip()
            if clean_g:
                db.add(NovelGenre(novel_id=novel.id, genre=clean_g))

    await db.flush()
    await db.refresh(novel, ["genres"])
    return NovelOut.model_validate(_serialize_novel(novel))

@router.delete("/novels/{novel_id}", status_code=204)
async def delete_novel(
    novel_id: int,
    db: AsyncSession = Depends(get_db),
):
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    await db.delete(novel)
    return None

# ── Chapter Management ────────────────────────────────────────────────
@router.post("/novels/{novel_id}/chapters", response_model=ChapterOut, status_code=201)
async def create_chapter(
    novel_id: int,
    body: ChapterCreate,
    db: AsyncSession = Depends(get_db),
):
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    clean_content = normalize_text(body.content)
    # Tự động tính word count
    words = len(re.findall(r"\w+", clean_content))

    chapter = Chapter(
        novel_id=novel.id,
        number=body.number,
        title=normalize_text(body.title),
        content=clean_content,
        word_count=words,
        is_premium=body.is_premium,
    )
    db.add(chapter)

    # Cập nhật số chương trong novel
    novel.total_chapters = await db.scalar(
        select(func.count(Chapter.id) + 1).where(Chapter.novel_id == novel.id)
    )

    await db.flush()
    return chapter

@router.put("/chapters/{chapter_id}", response_model=ChapterOut)
async def update_chapter(
    chapter_id: int,
    body: ChapterUpdate,
    db: AsyncSession = Depends(get_db),
):
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương")

    if body.title is not None:
        chapter.title = normalize_text(body.title)
    if body.number is not None:
        chapter.number = body.number
    if body.content is not None:
        chapter.content = normalize_text(body.content)
        chapter.word_count = len(re.findall(r"\w+", chapter.content))
    if body.is_premium is not None:
        chapter.is_premium = body.is_premium

    await db.flush()
    return chapter

@router.delete("/chapters/{chapter_id}", status_code=204)
async def delete_chapter(
    chapter_id: int,
    db: AsyncSession = Depends(get_db),
):
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương")

    novel_id = chapter.novel_id
    await db.delete(chapter)
    await db.flush()

    # Recalculate total_chapters
    count = (await db.scalar(select(func.count(Chapter.id)).where(Chapter.novel_id == novel_id))) or 0
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if novel:
        novel.total_chapters = count

    return None

# ── Folder Sync / Ingestion ───────────────────────────────────────────
@router.post("/sync-folders")
async def trigger_folder_sync(db: AsyncSession = Depends(get_db)):
    res = await sync_folder_to_db(db, DATA_DIR)
    return res

@router.post("/export-folders")
async def trigger_folder_export(db: AsyncSession = Depends(get_db)):
    res = await export_db_to_folder(db, DATA_DIR)
    return res
