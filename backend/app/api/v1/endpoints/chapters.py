from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.schemas.novel import ChapterOut
from app.core.text import normalize_text

router = APIRouter(tags=["chapters"])

@router.get("/novels/{slug}/chapters/{number}", response_model=ChapterOut)
async def get_chapter(slug: str, number: int, db: AsyncSession = Depends(get_db)):
    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(404, "Không tìm thấy truyện")
    chapter = (await db.execute(
        select(Chapter).where(Chapter.novel_id == novel.id, Chapter.number == number)
    )).scalar_one_or_none()
    if not chapter:
        raise HTTPException(404, "Không tìm thấy chương")
    
    # Đảm bảo Unicode NFC trước khi gửi tới frontend
    chapter.title = normalize_text(chapter.title)
    chapter.content = normalize_text(chapter.content)
    return chapter