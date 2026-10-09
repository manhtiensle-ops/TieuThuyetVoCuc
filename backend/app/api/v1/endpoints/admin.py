import re
import shutil
from datetime import datetime
from math import ceil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.novel import Novel, NovelGenre, NovelTag
from app.models.chapter import Chapter
from app.models.comment import Comment
from app.models.report import Report
from app.models.blocked_ip import BlockedIP
from app.schemas.user import UserOut, UserUpdateAdmin
from app.schemas.novel import (
    NovelOut,
    NovelCreate,
    NovelUpdate,
    ChapterOut,
    ChapterCreate,
    ChapterUpdate,
)
from app.schemas.admin import AdminStatsOut, UserListOut, ReportListOut
from app.schemas.report import (
    ReportOut,
    ReportActionRequest,
    BlockedIPOut,
    BlockedIPCreate,
)
from app.core.deps import require_roles
from app.core.text import normalize_text, remove_diacritics
from app.core.ip_ban import add_ip_to_cache, remove_ip_from_cache
from app.core.chapter_cache import invalidate_chapter
from app.services.ingestion import sync_folder_to_db, export_db_to_folder

from app.core.text import safe_novel_path

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

def _serialize_report(report: Report) -> dict:
    uploader_name = None
    uploader_id = None
    uploader_ip = None
    novel_title = "Truyện đã bị gỡ bỏ"
    novel_slug = ""
    novel_cover = None

    if report.novel:
        novel_title = normalize_text(report.novel.title)
        novel_slug = report.novel.slug
        novel_cover = report.novel.cover_url
        uploader_id = report.novel.uploader_id
        uploader_ip = report.novel.uploader_ip
        if report.novel.uploader:
            uploader_name = normalize_text(report.novel.uploader.display_name)
        elif report.novel.author:
            uploader_name = normalize_text(report.novel.author)

    reporter_name = "Khách ẩn danh"
    if report.reporter:
        reporter_name = normalize_text(report.reporter.display_name)

    return {
        "id": report.id,
        "novel_id": report.novel_id,
        "novel_title": novel_title,
        "novel_slug": novel_slug,
        "novel_cover_url": novel_cover,
        "uploader_id": uploader_id,
        "uploader_name": uploader_name,
        "uploader_ip": uploader_ip,
        "reporter_id": report.reporter_id,
        "reporter_name": reporter_name,
        "reporter_ip": report.reporter_ip,
        "reason": normalize_text(report.reason),
        "details": normalize_text(report.details),
        "status": report.status,
        "admin_action": report.admin_action,
        "admin_notes": normalize_text(report.admin_notes or ""),
        "created_at": report.created_at,
        "resolved_at": report.resolved_at,
    }

# ── Stats ─────────────────────────────────────────────────────────────
@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    total_users = (await db.scalar(select(func.count(User.id)))) or 0
    total_novels = (await db.scalar(select(func.count(Novel.id)))) or 0
    total_chapters = (await db.scalar(select(func.count(Chapter.id)))) or 0
    total_views = (await db.scalar(select(func.sum(Novel.views)))) or 0
    pending_reports = (await db.scalar(select(func.count(Report.id)).where(Report.status == "pending"))) or 0
    blocked_ips_count = (await db.scalar(select(func.count(BlockedIP.id)))) or 0

    return AdminStatsOut(
        total_users=total_users,
        total_novels=total_novels,
        total_chapters=total_chapters,
        total_views=int(total_views),
        pending_reports=pending_reports,
        blocked_ips_count=blocked_ips_count,
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
        stmt = stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"), User.display_name.ilike(f"%{q}%")))

    count_stmt = select(func.count(User.id))
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if q:
        count_stmt = count_stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"), User.display_name.ilike(f"%{q}%")))

    total = (await db.scalar(count_stmt)) or 0
    items = (await db.execute(stmt.order_by(User.id.desc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()

    return UserListOut(
        items=[UserOut.model_validate(u) for u in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total else 1,
    )

@router.put("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_roles("admin"))])
async def update_user_admin(
    user_id: int,
    body: UserUpdateAdmin,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_banned is not None:
        user.is_banned = body.is_banned
    if body.ban_reason is not None:
        user.ban_reason = body.ban_reason

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)

@router.post("/users/{user_id}/ban", dependencies=[Depends(require_roles("admin"))])
async def ban_user(
    user_id: int,
    reason: str = Query("Vi phạm quy định nền tảng"),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Không thể khóa tài khoản Admin")

    user.is_banned = True
    user.is_active = False
    user.ban_reason = reason
    await db.commit()
    return {"success": True, "message": f"Đã khóa tài khoản {user.username}"}

@router.post("/users/{user_id}/unban", dependencies=[Depends(require_roles("admin"))])
async def unban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    user.is_banned = False
    user.is_active = True
    user.ban_reason = None
    await db.commit()
    return {"success": True, "message": f"Đã mở khóa tài khoản {user.username}"}

# ── Report Management & Moderation ────────────────────────────────────
@router.get("/reports", response_model=ReportListOut)
async def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=50),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Report).options(
        selectinload(Report.novel).selectinload(Novel.uploader),
        selectinload(Report.reporter),
    )
    count_stmt = select(func.count(Report.id))

    if status and status != "all":
        stmt = stmt.where(Report.status == status)
        count_stmt = count_stmt.where(Report.status == status)

    total = (await db.scalar(count_stmt)) or 0
    items = (await db.execute(stmt.order_by(Report.created_at.desc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()

    return ReportListOut(
        items=[ReportOut.model_validate(_serialize_report(r)) for r in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total else 1,
    )

@router.post("/reports/{report_id}/action", dependencies=[Depends(require_roles("admin"))])
async def handle_report_action(
    report_id: int,
    body: ReportActionRequest,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Phân xử báo cáo vi phạm: bác bỏ, xóa truyện, cấm user, hoặc cấm triệt để IP."""
    stmt = select(Report).options(
        selectinload(Report.novel).selectinload(Novel.uploader),
        selectinload(Report.reporter),
    ).where(Report.id == report_id)
    report = (await db.execute(stmt)).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo vi phạm")

    novel = report.novel

    if body.action == "dismiss":
        report.status = "dismissed"
        report.admin_action = "dismissed"
        report.admin_notes = body.notes or "Báo cáo không có căn cứ"
        report.resolved_at = datetime.now()
        report.resolved_by_id = current_user.id
        await db.commit()
        return {"success": True, "message": "Đã bác bỏ báo cáo vi phạm"}

    elif body.action == "delete_novel":
        novel_title = novel.title if novel else "Truyện"
        if novel:
            try:
                folder = safe_novel_path(DATA_DIR, novel.slug)
                if folder.exists():
                    shutil.rmtree(folder)
            except Exception:
                pass
            await db.delete(novel)

        report.status = "resolved"
        report.admin_action = "deleted_novel"
        report.admin_notes = body.notes or f"Đã xóa truyện '{novel_title}' do vi phạm bản quyền / chính sách."
        report.resolved_at = datetime.now()
        report.resolved_by_id = current_user.id
        await db.commit()
        return {"success": True, "message": f"Đã xóa vĩnh viễn truyện '{novel_title}' và xử lý xong tố cáo"}

    elif body.action == "ban_user":
        novel_title = novel.title if novel else "Truyện"
        uploader_name = "Người dùng"
        if novel and novel.uploader:
            uploader = novel.uploader
            uploader_name = uploader.username
            uploader.is_banned = True
            uploader.is_active = False
            uploader.ban_reason = body.notes or f"Vi phạm bản quyền khi đăng tải truyện '{novel_title}'"

        if novel:
            try:
                folder = safe_novel_path(DATA_DIR, novel.slug)
                if folder.exists():
                    shutil.rmtree(folder)
            except Exception:
                pass
            await db.delete(novel)

        report.status = "resolved"
        report.admin_action = "banned_user"
        report.admin_notes = body.notes or f"Đã khóa tài khoản {uploader_name} và gỡ bỏ truyện vi phạm."
        report.resolved_at = datetime.now()
        report.resolved_by_id = current_user.id
        await db.commit()
        return {"success": True, "message": f"Đã khóa tài khoản '{uploader_name}' và gỡ bỏ truyện vi phạm"}

    elif body.action == "block_ip":
        target_ip = None
        if novel and novel.uploader_ip:
            target_ip = novel.uploader_ip
        novel_title = novel.title if novel else "Truyện"

        if not target_ip:
            raise HTTPException(status_code=400, detail="Không xác định được IP của người đăng truyện")

        # Thêm IP vào danh sách chặn
        existing = (await db.execute(select(BlockedIP).where(BlockedIP.ip_address == target_ip))).scalar_one_or_none()
        if not existing:
            blocked_entry = BlockedIP(
                ip_address=target_ip,
                reason=body.notes or f"Tố cáo vi phạm bản quyền truyện: {novel_title}",
                blocked_by_id=current_user.id,
            )
            db.add(blocked_entry)
            add_ip_to_cache(target_ip)

        # Khóa luôn tài khoản nếu có
        if novel and novel.uploader:
            uploader = novel.uploader
            uploader.is_banned = True
            uploader.is_active = False
            uploader.ban_reason = f"Chặn IP {target_ip} do vi phạm bản quyền nghiêm trọng"

        # Gỡ bỏ truyện
        if novel:
            try:
                folder = safe_novel_path(DATA_DIR, novel.slug)
                if folder.exists():
                    shutil.rmtree(folder)
            except Exception:
                pass
            await db.delete(novel)

        report.status = "resolved"
        report.admin_action = "blocked_ip"
        report.admin_notes = f"Đã chặn IP {target_ip} và gỡ bỏ truyện. {body.notes or ''}"
        report.resolved_at = datetime.now()
        report.resolved_by_id = current_user.id
        await db.commit()
        return {"success": True, "message": f"Đã đưa IP {target_ip} vào Blacklist, khóa tài khoản và gỡ bỏ truyện vi phạm"}

    else:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ")

# ── Comment Moderation ────────────────────────────────────────────────
@router.get("/comments", dependencies=[Depends(require_roles("admin"))])
async def list_admin_comments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Quản trị danh sách bình luận hệ thống."""
    query = select(Comment).options(
        selectinload(Comment.user),
        selectinload(Comment.chapter).selectinload(Chapter.novel)
    )
    count_query = select(func.count(Comment.id))

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(Comment.content.ilike(search_pattern))
        count_query = count_query.where(Comment.content.ilike(search_pattern))

    total = (await db.scalar(count_query)) or 0
    items = (await db.execute(
        query.order_by(Comment.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return {
        "items": [
            {
                "id": c.id,
                "content": c.content,
                "chapter_id": c.chapter_id,
                "chapter_title": c.chapter.title if c.chapter else None,
                "chapter_number": c.chapter.number if c.chapter else None,
                "novel_title": c.chapter.novel.title if c.chapter and c.chapter.novel else None,
                "novel_slug": c.chapter.novel.slug if c.chapter and c.chapter.novel else None,
                "paragraph_index": c.paragraph_index,
                "parent_id": c.parent_id,
                "is_spoiler": c.is_spoiler,
                "created_at": c.created_at,
                "user": {
                    "id": c.user.id,
                    "username": c.user.username,
                    "display_name": c.user.display_name,
                    "avatar_url": c.user.avatar_url,
                    "role": c.user.role,
                } if c.user else None,
            }
            for c in items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": ceil(total / per_page) if total else 1,
    }

# ── Blocked IP Management ─────────────────────────────────────────────
@router.get("/blocked-ips", response_model=list[BlockedIPOut], dependencies=[Depends(require_roles("admin"))])
async def list_blocked_ips(db: AsyncSession = Depends(get_db)):
    stmt = select(BlockedIP).options(selectinload(BlockedIP.blocked_by)).order_by(BlockedIP.created_at.desc())
    results = (await db.execute(stmt)).scalars().all()
    return [
        BlockedIPOut(
            id=b.id,
            ip_address=b.ip_address,
            reason=b.reason,
            created_at=b.created_at,
            blocked_by_id=b.blocked_by_id,
            blocked_by_name=b.blocked_by.display_name if b.blocked_by else None,
        )
        for b in results
    ]

@router.post("/blocked-ips", response_model=BlockedIPOut, dependencies=[Depends(require_roles("admin"))])
async def block_ip_manual(
    body: BlockedIPCreate,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    clean_ip = body.ip_address.strip()
    existing = (await db.execute(select(BlockedIP).where(BlockedIP.ip_address == clean_ip))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="IP này đã nằm trong danh sách đen")

    blocked_entry = BlockedIP(
        ip_address=clean_ip,
        reason=body.reason.strip(),
        blocked_by_id=current_user.id,
    )
    db.add(blocked_entry)
    await db.commit()
    await db.refresh(blocked_entry)
    add_ip_to_cache(clean_ip)

    return BlockedIPOut(
        id=blocked_entry.id,
        ip_address=blocked_entry.ip_address,
        reason=blocked_entry.reason,
        created_at=blocked_entry.created_at,
        blocked_by_id=current_user.id,
        blocked_by_name=current_user.display_name,
    )

@router.delete("/blocked-ips/{ip_id}", status_code=204, dependencies=[Depends(require_roles("admin"))])
async def unblock_ip(
    ip_id: int,
    db: AsyncSession = Depends(get_db),
):
    entry = (await db.execute(select(BlockedIP).where(BlockedIP.id == ip_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy IP trong danh sách đen")
    remove_ip_from_cache(entry.ip_address)
    await db.delete(entry)
    await db.commit()
    return None

# ── Novel Management ──────────────────────────────────────────────────
@router.post("/novels", response_model=NovelOut, status_code=201)
async def create_novel_admin(
    body: NovelCreate,
    db: AsyncSession = Depends(get_db),
):
    slug = body.slug if body.slug else _slugify(body.title)
    existing = (await db.execute(select(Novel).where(Novel.slug == slug))).scalar_one_or_none()
    if existing:
        slug = f"{slug}-{int(datetime.now().timestamp())}"

    novel = Novel(
        slug=slug,
        title=normalize_text(body.title),
        author=normalize_text(body.author or "Khuyết Danh"),
        description=normalize_text(body.description),
        cover_url=body.cover_url,
        status=body.status,
    )
    db.add(novel)
    await db.flush()

    for g in body.genres:
        clean_g = normalize_text(g.strip())
        if clean_g:
            db.add(NovelGenre(novel_id=novel.id, genre=clean_g))

    for t in body.tags:
        clean_t = normalize_text(t.strip())
        if clean_t:
            db.add(NovelTag(novel_id=novel.id, tag=clean_t))

    await db.commit()
    result = await db.execute(
        select(Novel).options(selectinload(Novel.genres), selectinload(Novel.tags), selectinload(Novel.uploader)).where(Novel.id == novel.id)
    )
    return _serialize_novel(result.scalar_one())

@router.put("/novels/{novel_id}", response_model=NovelOut)
async def update_novel_admin(
    novel_id: int,
    body: NovelUpdate,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Novel).options(selectinload(Novel.genres), selectinload(Novel.tags), selectinload(Novel.uploader)).where(Novel.id == novel_id)
    novel = (await db.execute(stmt)).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")

    if body.title is not None:
        novel.title = normalize_text(body.title)
    if body.author is not None:
        novel.author = normalize_text(body.author)
    if body.slug is not None:
        novel.slug = body.slug
    if body.description is not None:
        novel.description = normalize_text(body.description)
    if body.cover_url is not None:
        novel.cover_url = body.cover_url
    if body.status is not None:
        novel.status = body.status

    if body.genres is not None:
        await db.execute(delete(NovelGenre).where(NovelGenre.novel_id == novel_id))
        for g in body.genres:
            clean_g = normalize_text(g.strip())
            if clean_g:
                db.add(NovelGenre(novel_id=novel.id, genre=clean_g))

    if body.tags is not None:
        await db.execute(delete(NovelTag).where(NovelTag.novel_id == novel_id))
        for t in body.tags:
            clean_t = normalize_text(t.strip())
            if clean_t:
                db.add(NovelTag(novel_id=novel.id, tag=clean_t))

    await db.commit()
    await db.refresh(novel)
    return _serialize_novel(novel)

@router.delete("/novels/{novel_id}", status_code=204)
async def delete_novel_admin(
    novel_id: int,
    db: AsyncSession = Depends(get_db),
):
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện")
    await db.delete(novel)
    await db.commit()
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
    await db.flush()

    count = (await db.scalar(select(func.count(Chapter.id)).where(Chapter.novel_id == novel.id))) or 0
    novel.total_chapters = count
    await db.commit()
    await db.refresh(chapter)
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

    await db.commit()
    await db.refresh(chapter)
    # Invalidate Redis cache sau khi sửa nội dung
    novel_obj = (await db.execute(select(Novel).where(Novel.id == chapter.novel_id))).scalar_one_or_none()
    if novel_obj:
        await invalidate_chapter(novel_obj.slug, chapter.number)
    return chapter

@router.delete("/chapters/{chapter_id}", status_code=204, dependencies=[Depends(require_roles("admin", "editor"))])
async def delete_chapter(
    chapter_id: int,
    db: AsyncSession = Depends(get_db),
):
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương")

    # Lấy slug trước khi xóa (cần để invalidate cache)
    novel_obj = (await db.execute(select(Novel).where(Novel.id == chapter.novel_id))).scalar_one_or_none()
    chapter_number = chapter.number

    novel_id = chapter.novel_id
    await db.delete(chapter)
    await db.flush()

    count = (await db.scalar(select(func.count(Chapter.id)).where(Chapter.novel_id == novel_id))) or 0
    novel = (await db.execute(select(Novel).where(Novel.id == novel_id))).scalar_one_or_none()
    if novel:
        novel.total_chapters = count

    await db.commit()
    # Invalidate Redis cache sau khi xóa chapter
    if novel_obj:
        await invalidate_chapter(novel_obj.slug, chapter_number)
    return None

# ── Folder Sync / Ingestion ───────────────────────────────────────────
# [FIX] Giới hạn chỉ admin — editor KHÔNG được phép chạy sync/export
# vì sync_folder_to_db() ghi đè DB từ file hệ thống (nguy cơ data injection)
@router.post("/sync-folders", dependencies=[Depends(require_roles("admin"))])
async def trigger_folder_sync(db: AsyncSession = Depends(get_db)):
    res = await sync_folder_to_db(db, DATA_DIR)
    return res

@router.post("/export-folders", dependencies=[Depends(require_roles("admin"))])
async def trigger_folder_export(db: AsyncSession = Depends(get_db)):
    res = await export_db_to_folder(db, DATA_DIR)
    return res
