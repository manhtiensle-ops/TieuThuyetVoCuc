from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.novel import Novel, NovelGenre
from app.models.chapter import Chapter
from app.schemas.novel import NovelOut, NovelListOut, ChapterMetaOut
from math import ceil

router = APIRouter(prefix="/novels", tags=["novels"])

# Shortcut: eager-load genres trong mọi query novel
def _novel_stmt():
    return select(Novel).options(selectinload(Novel.genres))

@router.get("/featured", response_model=list[NovelOut])
async def get_featured(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        _novel_stmt().where(Novel.rating >= 4.5).order_by(Novel.rating.desc()).limit(12)
    )
    novels = result.scalars().all()
    return [_serialize(n) for n in novels]

@router.get("/hot", response_model=list[NovelOut])
async def get_hot(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        _novel_stmt().order_by(Novel.views.desc()).limit(16)
    )
    novels = result.scalars().all()
    return [_serialize(n) for n in novels]

@router.get("", response_model=NovelListOut)
async def list_novels(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=50),
    genre: str | None = None,
    status: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = _novel_stmt()
    if genre:
        stmt = stmt.join(NovelGenre).where(NovelGenre.genre == genre)
    if status:
        stmt = stmt.where(Novel.status == status)
    if q:
        stmt = stmt.where(or_(Novel.title.ilike(f"%{q}%"), Novel.author.ilike(f"%{q}%")))

    count_stmt = select(func.count(Novel.id))
    if genre:
        count_stmt = count_stmt.join(NovelGenre).where(NovelGenre.genre == genre)
    if status:
        count_stmt = count_stmt.where(Novel.status == status)
    if q:
        count_stmt = count_stmt.where(or_(Novel.title.ilike(f"%{q}%"), Novel.author.ilike(f"%{q}%")))

    total = (await db.scalar(count_stmt)) or 0
    items = (await db.execute(stmt.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    serialized = [NovelOut.model_validate(_serialize(n)) for n in items]
    return NovelListOut(
        items=serialized,
        total=total, page=page, per_page=per_page,
        total_pages=ceil(total / per_page) if total else 1,
    )

@router.get("/{slug}", response_model=NovelOut)
async def get_novel(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(_novel_stmt().where(Novel.slug == slug))
    novel = result.scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    return _serialize(novel)

@router.get("/{slug}/chapters", response_model=list[ChapterMetaOut])
async def get_chapters(slug: str, db: AsyncSession = Depends(get_db)):
    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    result = await db.execute(
        select(Chapter).where(Chapter.novel_id == novel.id).order_by(Chapter.number)
    )
    return result.scalars().all()

def _serialize(novel: Novel) -> dict:
    """Convert Novel ORM → dict với genres là list[str]."""
    return {
        "id": novel.id,
        "slug": novel.slug,
        "title": novel.title,
        "author": novel.author,
        "cover_url": novel.cover_url,
        "description": novel.description,
        "genres": [g.genre for g in novel.genres],
        "status": novel.status,
        "total_chapters": novel.total_chapters,
        "views": novel.views,
        "rating": novel.rating,
        "updated_at": novel.updated_at,
    }
