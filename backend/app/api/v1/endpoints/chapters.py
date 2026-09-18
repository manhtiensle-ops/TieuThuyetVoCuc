from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.comment import Comment
from app.models.user import User
from app.schemas.novel import ChapterOut
from app.schemas.comment import CommentOut, CommentCreate
from app.core.deps import get_current_user

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
    return chapter

@router.get("/chapters/{chapter_id}/comments", response_model=list[CommentOut])
async def get_comments(chapter_id: int, page: int = 1, per_page: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment).where(Comment.chapter_id == chapter_id, Comment.parent_id.is_(None))
        .offset((page - 1) * per_page).limit(per_page)
    )
    return result.scalars().all()

@router.post("/chapters/{chapter_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    chapter_id: int,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = Comment(chapter_id=chapter_id, user_id=current_user.id, **body.model_dump())
    db.add(comment)
    await db.flush()
    return comment