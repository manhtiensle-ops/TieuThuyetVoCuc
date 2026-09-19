import json
import uuid
from math import ceil
from pathlib import Path
from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, distinct
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.novel import Novel, NovelGenre, NovelTag
from app.models.chapter import Chapter
from app.models.report import Report
from app.models.user import User
from app.schemas.novel import (
    NovelOut,
    NovelListOut,
    NovelCreate,
    NovelUpdate,
    ChapterMetaOut,
    ChapterCreate,
)
from app.schemas.report import ReportCreate
from app.core.text import normalize_text, slugify
from app.core.deps import get_current_user, get_optional_current_user, get_db
from app.core.ip_ban import get_client_ip

router = APIRouter(prefix="/novels", tags=["novels"])

DATA_DIR = Path(__file__).resolve().parents[5] / "data" / "novels"

def _novel_stmt():
    return select(Novel).options(
        selectinload(Novel.genres),
        selectinload(Novel.tags),
        selectinload(Novel.uploader),
    )

def _serialize(novel: Novel) -> dict:
    """Convert Novel ORM → dict với Unicode NFC, tags, genres, và thông tin uploader."""
    uploader_name = None
    if novel.uploader:
        uploader_name = normalize_text(novel.uploader.display_name)
    elif novel.author:
        uploader_name = normalize_text(novel.author)

    return {
        "id": novel.id,
        "slug": novel.slug,
        "title": normalize_text(novel.title),
        "author": normalize_text(novel.author),
        "cover_url": novel.cover_url,
        "description": normalize_text(novel.description),
        "genres": [normalize_text(g.genre) for g in novel.genres],
        "tags": [normalize_text(t.tag) for t in novel.tags],
        "status": novel.status,
        "total_chapters": novel.total_chapters,
        "views": novel.views,
        "rating": novel.rating,
        "uploader_id": novel.uploader_id,
        "uploader_name": uploader_name,
        "updated_at": novel.updated_at,
    }

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

@router.get("/taxonomy/all")
async def get_taxonomy_all(db: AsyncSession = Depends(get_db)):
    """Trả về danh sách thể loại (genres) và nhãn dán người dùng (tags) kèm số lượng truyện."""
    genre_rows = (await db.execute(
        select(NovelGenre.genre, func.count(NovelGenre.novel_id).label("count"))
        .group_by(NovelGenre.genre)
        .order_by(func.count(NovelGenre.novel_id).desc())
    )).all()

    tag_rows = (await db.execute(
        select(NovelTag.tag, func.count(NovelTag.novel_id).label("count"))
        .group_by(NovelTag.tag)
        .order_by(func.count(NovelTag.novel_id).desc())
    )).all()

    return {
        "genres": [{"name": normalize_text(r[0]), "count": r[1]} for r in genre_rows],
        "tags": [{"name": normalize_text(r[0]), "count": r[1]} for r in tag_rows],
    }

@router.get("", response_model=NovelListOut)
async def list_novels(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=50),
    genre: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    q: str | None = None,
    uploader: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = _novel_stmt()
    count_stmt = select(func.count(distinct(Novel.id)))

    if genre:
        stmt = stmt.join(Novel.genres).where(NovelGenre.genre.ilike(f"%{genre}%"))
        count_stmt = count_stmt.join(Novel.genres).where(NovelGenre.genre.ilike(f"%{genre}%"))
    if tag:
        stmt = stmt.join(Novel.tags).where(NovelTag.tag.ilike(f"%{tag}%"))
        count_stmt = count_stmt.join(Novel.tags).where(NovelTag.tag.ilike(f"%{tag}%"))
    if status:
        stmt = stmt.where(Novel.status == status)
        count_stmt = count_stmt.where(Novel.status == status)
    if uploader:
        stmt = stmt.join(Novel.uploader).where(User.username == uploader)
        count_stmt = count_stmt.join(Novel.uploader).where(User.username == uploader)
    if q:
        search_filter = or_(
            Novel.title.ilike(f"%{q}%"),
            Novel.author.ilike(f"%{q}%"),
            Novel.description.ilike(f"%{q}%"),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    total = (await db.scalar(count_stmt)) or 0
    stmt = stmt.distinct().order_by(Novel.updated_at.desc()).offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(stmt)).scalars().all()
    serialized = [NovelOut.model_validate(_serialize(n)) for n in items]

    return NovelListOut(
        items=serialized,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total else 1,
    )

@router.post("", response_model=NovelOut, status_code=status.HTTP_201_CREATED)
async def create_novel(
    novel_in: NovelCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User đăng tải truyện tùy ý: tiêu đề, tác giả, ảnh bìa, nội dung, thể loại, gắn nhãn tùy ý."""
    if current_user.is_banned or not current_user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị cấm đăng truyện")

    # Author mặc định là tên hiển thị của user nếu để trống
    author_name = novel_in.author.strip() if (novel_in.author and novel_in.author.strip()) else current_user.display_name

    # Slugify title
    base_slug = novel_in.slug.strip() if novel_in.slug else slugify(novel_in.title)
    final_slug = base_slug
    # Check slug uniqueness
    counter = 1
    while True:
        existing = (await db.execute(select(Novel.id).where(Novel.slug == final_slug))).scalar_one_or_none()
        if not existing:
            break
        counter += 1
        final_slug = f"{base_slug}-{counter}"

    client_ip = get_client_ip(request)

    novel = Novel(
        slug=final_slug,
        title=normalize_text(novel_in.title.strip()),
        author=normalize_text(author_name),
        description=normalize_text(novel_in.description.strip()),
        cover_url=novel_in.cover_url,
        status=novel_in.status if novel_in.status in ["ongoing", "completed", "hiatus"] else "ongoing",
        uploader_id=current_user.id,
        uploader_ip=client_ip,
        total_chapters=0,
        views=0,
        rating=5.0,
    )
    db.add(novel)
    await db.flush()

    # Add genres
    for g in novel_in.genres:
        clean_g = normalize_text(g.strip())
        if clean_g:
            db.add(NovelGenre(novel_id=novel.id, genre=clean_g))

    # Add user custom tags
    for t in novel_in.tags:
        clean_t = normalize_text(t.strip())
        if clean_t:
            db.add(NovelTag(novel_id=novel.id, tag=clean_t))

    # Nếu có chương 1 khởi tạo ngay lúc đăng truyện
    if novel_in.first_chapter_content and novel_in.first_chapter_content.strip():
        ch_title = novel_in.first_chapter_title.strip() if novel_in.first_chapter_title else "Chương 1: Mở Đầu"
        content = normalize_text(novel_in.first_chapter_content.strip())
        word_count = len(content.split())
        chapter = Chapter(
            novel_id=novel.id,
            number=1,
            title=normalize_text(ch_title),
            content=content,
            word_count=word_count,
            is_premium=False,
        )
        db.add(chapter)
        novel.total_chapters = 1

    await db.commit()

    # Eager reload for serialization
    novel_full = (await db.execute(_novel_stmt().where(Novel.id == novel.id))).scalar_one()

    # Sync folder on disk: data/novels/{slug}/metadata.json
    try:
        novel_folder = DATA_DIR / final_slug
        novel_folder.mkdir(parents=True, exist_ok=True)
        meta_path = novel_folder / "metadata.json"
        meta_content = {
            "title": novel.title,
            "author": novel.author,
            "status": novel.status,
            "description": novel.description,
            "cover_url": novel.cover_url,
            "genres": [g.genre for g in novel_full.genres],
            "tags": [t.tag for t in novel_full.tags],
            "uploader": current_user.username,
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_content, f, ensure_ascii=False, indent=2)

        if novel_in.first_chapter_content and novel_in.first_chapter_content.strip():
            ch_file = novel_folder / "001-mo-dau.md"
            with open(ch_file, "w", encoding="utf-8") as f:
                f.write(f"---\nnumber: 1\ntitle: {novel_in.first_chapter_title or 'Chương 1: Mở Đầu'}\nis_premium: false\n---\n\n{novel_in.first_chapter_content.strip()}\n")
    except Exception:
        pass  # non-fatal for HTTP response

    return NovelOut.model_validate(_serialize(novel_full))

@router.get("/{slug}", response_model=NovelOut)
async def get_novel(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(_novel_stmt().where(Novel.slug == slug))
    novel = result.scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    # Serialize dữ liệu trước khi commit để tránh expire ORM attributes
    data = _serialize(novel)
    novel.views += 1
    await db.commit()
    return data

@router.get("/{slug}/chapters", response_model=list[ChapterMetaOut])
async def get_chapters(slug: str, db: AsyncSession = Depends(get_db)):
    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    result = await db.execute(
        select(Chapter).where(Chapter.novel_id == novel.id).order_by(Chapter.number)
    )
    return result.scalars().all()

@router.post("/{slug}/chapters", response_model=ChapterMetaOut, status_code=status.HTTP_201_CREATED)
async def add_chapter_to_novel(
    slug: str,
    chapter_in: ChapterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User uploader hoặc admin thêm chương mới cho truyện."""
    if current_user.is_banned or not current_user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa")

    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    # Quyền: tác giả của truyện hoặc admin/editor
    if novel.uploader_id != current_user.id and current_user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Bạn không phải người đăng truyện này")

    # Kiểm tra số chương đã tồn tại chưa
    existing_ch = (await db.execute(
        select(Chapter).where(Chapter.novel_id == novel.id, Chapter.number == chapter_in.number)
    )).scalar_one_or_none()
    if existing_ch:
        raise HTTPException(status_code=400, detail=f"Chương số {chapter_in.number} đã tồn tại")

    content = normalize_text(chapter_in.content)
    word_count = len(content.split())
    chapter = Chapter(
        novel_id=novel.id,
        number=chapter_in.number,
        title=normalize_text(chapter_in.title),
        content=content,
        word_count=word_count,
        is_premium=chapter_in.is_premium,
    )
    db.add(chapter)
    novel.total_chapters += 1
    await db.commit()
    await db.refresh(chapter)

    # Ghi file ra data/novels/{slug}/
    try:
        novel_folder = DATA_DIR / slug
        novel_folder.mkdir(parents=True, exist_ok=True)
        file_slug = slugify(chapter.title)
        ch_file = novel_folder / f"{chapter.number:03d}-{file_slug}.md"
        with open(ch_file, "w", encoding="utf-8") as f:
            f.write(f"---\nnumber: {chapter.number}\ntitle: {chapter.title}\nis_premium: {str(chapter.is_premium).lower()}\n---\n\n{chapter.content}\n")
    except Exception:
        pass

    return chapter

@router.post("/{slug}/report", status_code=status.HTTP_201_CREATED)
async def report_novel(
    slug: str,
    report_in: ReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """User gửi báo cáo vi phạm (bản quyền, nội dung độc hại, spam) để Admin phân xử."""
    novel = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Truyện không tồn tại")

    client_ip = get_client_ip(request)
    report = Report(
        novel_id=novel.id,
        reporter_id=current_user.id if current_user else None,
        reporter_ip=client_ip,
        reason=normalize_text(report_in.reason),
        details=normalize_text(report_in.details),
        status="pending",
    )
    db.add(report)
    await db.commit()

    return {
        "success": True,
        "message": "Báo cáo vi phạm đã được gửi tới Ban Quản Trị. Chúng tôi sẽ phân xử sớm nhất.",
        "report_id": report.id,
    }
