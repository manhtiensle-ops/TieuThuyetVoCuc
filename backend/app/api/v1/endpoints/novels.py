from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.session import get_db
from app.models.novel import Novel, NovelGenre
from app.models.chapter import Chapter
from app.schemas.novel import NovelOut, NovelListOut, ChapterMetaOut
from math import ceil

router = APIRouter(prefix="/novels", tags=["novels"])

@router.get("/featured", response_model=list[NovelOut])
async def get_featured(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Novel).where(Novel.rating >= 4.5).order_by(Novel.rating.desc()).limit(12))
    return result.scalars().all()

@router.get("/hot", response_model=list[NovelOut])
async def get_hot(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Novel).order_by(Novel.views.desc()).limit(16))
    return result.scalars().all()

@router.get("", response_model=NovelListOut)
async def list_novels(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=50),
    genre: str | None = None,
    status: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Novel)
    if genre:
        stmt = stmt.join(NovelGenre).where(NovelGenre.genre == genre)
    if status:
        stmt = stmt.where(Novel.status == status)
    if q:
        stmt = stmt.where(or_(Novel.title.ilike(f"%{q}%"), Novel.author.ilike(f"%{q}%")))

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = (await db.execute(stmt.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return NovelListOut(items=items, total=total, page=page, per_page=per_page, total_pages=ceil(total / per_page))

@router.get("/{slug}", response_model=NovelOut)
async def get_novel(slug: str, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Novel).where(Novel.slug == slug))
    novel = result.scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    return novel

@router.get("/{slug}/chapters", response_model=list[ChapterMetaOut])
async def get_chapters(slug: str, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    result = await db.execute(select(Chapter).where(Chapter.novel_id == novel.id).order_by(Chapter.number))
    return result.scalars().all()