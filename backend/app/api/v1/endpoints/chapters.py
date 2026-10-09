from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.user import User
from app.schemas.novel import ChapterOut
from app.core.text import normalize_text
from app.core.deps import get_optional_current_user, get_current_user
from app.core.chapter_cache import get_cached_chapter, set_cached_chapter, invalidate_chapter

router = APIRouter(tags=["chapters"])

# Roles được phép đọc chapter premium đầy đủ
_PREMIUM_ROLES = {"admin", "editor", "vip"}

# Tỷ lệ preview trả về khi user không có quyền đọc premium (20%)
_PREVIEW_RATIO = 0.20


@router.get("/novels/{slug}/chapters/{number}", response_model=ChapterOut)
async def get_chapter(
    slug: str,
    number: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    user_role = getattr(current_user, "role", None)
    has_premium_access = user_role in _PREMIUM_ROLES

    # ── Cache lookup (chỉ cache free chapter và premium full content) ──────
    # Locked preview không cache vì phụ thuộc user state
    cache_variant: str | None = None

    # Thử lấy từ cache trước khi query DB
    # Với free chapter: variant = "free"
    # Với premium + có quyền: variant = "premium"
    # Với locked: không dùng cache
    cached = await get_cached_chapter(slug, number, "free")
    if cached and not cached.get("is_premium"):
        return ChapterOut(**cached)

    if has_premium_access:
        cached = await get_cached_chapter(slug, number, "premium")
        if cached:
            return ChapterOut(**cached)

    # ── DB query ──────────────────────────────────────────────────────────
    novel = (await db.execute(
        select(Novel).where(Novel.slug == slug)
    )).scalar_one_or_none()
    if not novel:
        raise HTTPException(404, "Không tìm thấy truyện")

    chapter = (await db.execute(
        select(Chapter).where(
            Chapter.novel_id == novel.id,
            Chapter.number == number,
        )
    )).scalar_one_or_none()
    if not chapter:
        raise HTTPException(404, "Không tìm thấy chương")

    # Đảm bảo Unicode NFC trước khi gửi tới frontend
    chapter.title = normalize_text(chapter.title)
    chapter.content = normalize_text(chapter.content)

    # [FIX] Premium gate — chặn reader thường & ẩn danh đọc chương VIP
    if chapter.is_premium and not has_premium_access:
        # Cắt 20% đầu làm preview, thay phần còn lại bằng thông báo
        full_content = chapter.content
        preview_len = max(1, int(len(full_content) * _PREVIEW_RATIO))
        preview_text = full_content[:preview_len]

        # Trả object ChapterOut với content bị cắt + is_locked=True
        # KHÔNG cache locked preview (phụ thuộc user state)
        return ChapterOut(
            id=chapter.id,
            novel_id=chapter.novel_id,
            number=chapter.number,
            title=chapter.title,
            content=preview_text,
            word_count=chapter.word_count,
            is_premium=chapter.is_premium,
            published_at=chapter.published_at,
            is_locked=True,
            locked_message=(
                "Chương này dành riêng cho thành viên VIP. "
                "Vui lòng nâng cấp tài khoản để đọc toàn bộ nội dung."
                if not current_user
                else "Tài khoản của bạn chưa đủ quyền đọc chương VIP. "
                     "Vui lòng nâng cấp lên VIP."
            ),
        )

    # ── Cache write ───────────────────────────────────────────────────────
    out = ChapterOut.model_validate(chapter)
    payload = out.model_dump(mode="json")

    if chapter.is_premium:
        cache_variant = "premium"
    else:
        cache_variant = "free"

    await set_cached_chapter(slug, number, cache_variant, payload)

    return out


# ── Tác giả xóa chương của mình ─────────────────────────────────────────────
_ADMIN_ROLES = {"admin", "editor"}

@router.delete(
    "/novels/{slug}/chapters/{number}",
    status_code=204,
    summary="Tác giả / admin xóa chương",
)
async def author_delete_chapter(
    slug: str,
    number: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa chương theo slug truyện + số chương.

    Quyền:
    - admin / editor : xóa bất kỳ chương nào.
    - Tác giả (uploader) : chỉ xóa chương thuộc truyện của mình.
    - Các role khác    : 403 Forbidden.
    """
    # 1. Tìm novel
    novel = (await db.execute(
        select(Novel).where(Novel.slug == slug)
    )).scalar_one_or_none()
    if not novel:
        raise HTTPException(status_code=404, detail="Không tìm thấy truyện.")

    # 2. Kiểm tra quyền
    is_admin = current_user.role in _ADMIN_ROLES
    is_owner = novel.uploader_id == current_user.id

    if not is_admin and not is_owner:
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xóa chương của truyện này.",
        )

    # 3. Tìm chương
    chapter = (await db.execute(
        select(Chapter).where(
            Chapter.novel_id == novel.id,
            Chapter.number == number,
        )
    )).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")

    # 4. Xóa
    await db.delete(chapter)
    await db.flush()

    # 5. Cập nhật total_chapters
    count = (await db.scalar(
        select(func.count(Chapter.id)).where(Chapter.novel_id == novel.id)
    )) or 0
    novel.total_chapters = count

    await db.commit()

    # 6. Invalidate Redis cache
    await invalidate_chapter(slug, number)

    return None
