import time
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.chapter import Chapter
from app.models.comment import Comment, CommentReaction
from app.models.user import User
from app.schemas.comment import (
    CommentCreate,
    CommentItem,
    CommentListOut,
    CommentReactionIn,
    CommentReactionOut,
    CommentsSummaryOut,
)
from app.core.deps import get_current_user, get_optional_current_user
from app.core.text import normalize_text
from app.core.redis import get_redis

router = APIRouter(tags=["comments"])

# Fallback in-memory rate limiting dict: user_id -> last_timestamp
_user_last_comment_ts: dict[int, float] = {}

async def _check_rate_limit(user_id: int):
    now = time.time()
    # Check Redis first
    r = await get_redis()
    if r:
        try:
            key = f"ratelimit:comment:{user_id}"
            is_limited = await r.get(key)
            if is_limited:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Bạn đang bình luận quá nhanh. Vui lòng chờ 5 giây trước khi gửi tiếp."
                )
            await r.setex(key, 5, "1")
            return
        except HTTPException:
            raise
        except Exception:
            pass

    # Fallback to in-memory
    last_ts = _user_last_comment_ts.get(user_id, 0.0)
    if now - last_ts < 5.0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đang bình luận quá nhanh. Vui lòng chờ 5 giây trước khi gửi tiếp."
        )
    _user_last_comment_ts[user_id] = now


async def _get_reactions_data(db: AsyncSession, comment_ids: list[int], current_user_id: Optional[int]):
    """Helper lấy thống kê reactions và my_reaction cho danh sách comment_id."""
    if not comment_ids:
        return {}, {}

    # Lấy tổng hợp reaction theo từng comment_id
    react_query = (
        select(CommentReaction.comment_id, CommentReaction.reaction_type, func.count(CommentReaction.id))
        .where(CommentReaction.comment_id.in_(comment_ids))
        .group_by(CommentReaction.comment_id, CommentReaction.reaction_type)
    )
    react_rows = (await db.execute(react_query)).all()

    reactions_map: dict[int, dict[str, int]] = {cid: {"like": 0, "laugh": 0, "fire": 0, "shock": 0} for cid in comment_ids}
    for cid, r_type, count in react_rows:
        if cid in reactions_map:
            reactions_map[cid][r_type] = count

    # Lấy my_reaction nếu đã đăng nhập
    my_reactions_map: dict[int, Optional[str]] = {cid: None for cid in comment_ids}
    if current_user_id:
        my_react_query = (
            select(CommentReaction.comment_id, CommentReaction.reaction_type)
            .where(
                CommentReaction.comment_id.in_(comment_ids),
                CommentReaction.user_id == current_user_id
            )
        )
        for cid, r_type in (await db.execute(my_react_query)).all():
            my_reactions_map[cid] = r_type

    return reactions_map, my_reactions_map


@router.get("/chapters/{chapter_id}/comments/summary", response_model=CommentsSummaryOut)
async def get_chapter_comments_summary(chapter_id: int, db: AsyncSession = Depends(get_db)):
    """Lấy thống kê số lượng bình luận theo từng đoạn văn và toàn chương."""
    # Kiểm tra chương tồn tại
    ch = (await db.execute(select(Chapter.id).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if not ch:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương truyện")

    query = (
        select(Comment.paragraph_index, func.count(Comment.id))
        .where(Comment.chapter_id == chapter_id)
        .group_by(Comment.paragraph_index)
    )
    rows = (await db.execute(query)).all()

    total_comments = 0
    chapter_comments_count = 0
    paragraph_counts: dict[str, int] = {}

    for para_idx, count in rows:
        total_comments += count
        if para_idx is None:
            chapter_comments_count = count
        else:
            paragraph_counts[str(para_idx)] = count

    return CommentsSummaryOut(
        chapter_id=chapter_id,
        total_comments=total_comments,
        chapter_comments_count=chapter_comments_count,
        paragraph_counts=paragraph_counts,
    )


@router.get("/chapters/{chapter_id}/comments", response_model=CommentListOut)
async def get_chapter_comments(
    chapter_id: int,
    paragraph_index: Optional[int] = Query(None, description="Lọc theo đoạn văn; nếu omit và all_comments=false thì lấy cmt cuối chương"),
    all_comments: bool = Query(False, description="Lấy toàn bộ comment không phân biệt đoạn"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Lấy danh sách bình luận (kèm replies và reactions)."""
    base_where = [Comment.chapter_id == chapter_id, Comment.parent_id.is_(None)]

    if not all_comments:
        if paragraph_index is not None:
            base_where.append(Comment.paragraph_index == paragraph_index)
        else:
            base_where.append(Comment.paragraph_index.is_(None))

    # Đếm tổng số root comments
    total_query = select(func.count(Comment.id)).where(*base_where)
    total = (await db.execute(total_query)).scalar() or 0

    # Lấy danh sách root comments kèm user
    offset = (page - 1) * per_page
    query = (
        select(Comment)
        .options(selectinload(Comment.user))
        .where(*base_where)
        .order_by(Comment.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    root_comments = (await db.execute(query)).scalars().all()
    root_ids = [c.id for c in root_comments]

    # Lấy toàn bộ replies cho các root comments này
    replies_map: dict[int, list[Comment]] = {cid: [] for cid in root_ids}
    all_comment_ids = list(root_ids)

    if root_ids:
        rep_query = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.parent_id.in_(root_ids))
            .order_by(Comment.created_at.asc())
        )
        replies = (await db.execute(rep_query)).scalars().all()
        for rep in replies:
            if rep.parent_id in replies_map:
                replies_map[rep.parent_id].append(rep)
            all_comment_ids.append(rep.id)

    # Lấy reactions cho toàn bộ comments + replies
    current_uid = current_user.id if current_user else None
    reactions_map, my_reactions_map = await _get_reactions_data(db, all_comment_ids, current_uid)

    items: list[CommentItem] = []
    for c in root_comments:
        rep_items: list[CommentItem] = []
        for rep in replies_map.get(c.id, []):
            rep_items.append(
                CommentItem(
                    id=rep.id,
                    chapter_id=rep.chapter_id,
                    user_id=rep.user_id,
                    paragraph_index=rep.paragraph_index,
                    parent_id=rep.parent_id,
                    content=rep.content,
                    is_spoiler=rep.is_spoiler,
                    created_at=rep.created_at,
                    updated_at=rep.updated_at,
                    user=rep.user,
                    reactions_count=reactions_map.get(rep.id, {}),
                    my_reaction=my_reactions_map.get(rep.id),
                    replies_count=0,
                    replies=[],
                )
            )

        items.append(
            CommentItem(
                id=c.id,
                chapter_id=c.chapter_id,
                user_id=c.user_id,
                paragraph_index=c.paragraph_index,
                parent_id=c.parent_id,
                content=c.content,
                is_spoiler=c.is_spoiler,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=c.user,
                reactions_count=reactions_map.get(c.id, {}),
                my_reaction=my_reactions_map.get(c.id),
                replies_count=len(rep_items),
                replies=rep_items,
            )
        )

    pages = (total + per_page - 1) // per_page if total > 0 else 1

    return CommentListOut(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/chapters/{chapter_id}/comments", response_model=CommentItem, status_code=status.HTTP_201_CREATED)
async def create_chapter_comment(
    chapter_id: int,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đăng bình luận cho đoạn văn hoặc toàn chương."""
    # Kiểm tra rate limit
    await _check_rate_limit(current_user.id)

    # Kiểm tra chương tồn tại
    ch = (await db.execute(select(Chapter.id).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if not ch:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương truyện")

    # Xử lý parent_id nếu là reply
    parent_id = body.parent_id
    paragraph_index = body.paragraph_index
    if parent_id is not None:
        parent_res = await db.execute(
            select(Comment).where(Comment.id == parent_id, Comment.chapter_id == chapter_id)
        )
        parent = parent_res.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Bình luận cha không tồn tại hoặc không thuộc chương này")
        # Giới hạn độ sâu 1 cấp: nếu parent đã là reply thì gán vào parent của nó
        if parent.parent_id is not None:
            parent_id = parent.parent_id
        # Kế thừa paragraph_index từ parent
        paragraph_index = parent.paragraph_index

    # Chuẩn hóa văn bản
    clean_content = normalize_text(body.content.strip())
    if len(clean_content) < 2:
        raise HTTPException(status_code=400, detail="Nội dung bình luận quá ngắn")

    new_comment = Comment(
        chapter_id=chapter_id,
        user_id=current_user.id,
        paragraph_index=paragraph_index,
        parent_id=parent_id,
        content=clean_content,
        is_spoiler=body.is_spoiler,
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)

    # Eager load user profile
    await db.refresh(new_comment, ["user"])

    return CommentItem(
        id=new_comment.id,
        chapter_id=new_comment.chapter_id,
        user_id=new_comment.user_id,
        paragraph_index=new_comment.paragraph_index,
        parent_id=new_comment.parent_id,
        content=new_comment.content,
        is_spoiler=new_comment.is_spoiler,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at,
        user=new_comment.user,
        reactions_count={"like": 0, "laugh": 0, "fire": 0, "shock": 0},
        my_reaction=None,
        replies_count=0,
        replies=[],
    )


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa bình luận (chủ sở hữu hoặc Admin)."""
    res = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = res.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")

    if comment.user_id != current_user.id and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này")

    await db.delete(comment)
    await db.commit()
    return {"message": "Đã xóa bình luận thành công"}


@router.post("/comments/{comment_id}/react", response_model=CommentReactionOut)
async def react_to_comment(
    comment_id: int,
    body: CommentReactionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thả hoặc đổi cảm xúc cho bình luận. Nếu bấm lại cùng loại cảm xúc -> Hủy (toggle off)."""
    # Kiểm tra bình luận tồn tại
    c_res = await db.execute(select(Comment.id).where(Comment.id == comment_id))
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")

    # Kiểm tra reaction hiện tại của user
    cur_res = await db.execute(
        select(CommentReaction).where(
            CommentReaction.comment_id == comment_id,
            CommentReaction.user_id == current_user.id
        )
    )
    existing_reaction = cur_res.scalar_one_or_none()

    active_reaction: Optional[str] = None

    if existing_reaction:
        if existing_reaction.reaction_type == body.reaction_type:
            # Nhấp lại loại đã chọn -> Hủy
            await db.delete(existing_reaction)
            active_reaction = None
        else:
            # Đổi sang loại khác
            existing_reaction.reaction_type = body.reaction_type
            active_reaction = body.reaction_type
    else:
        # Thêm mới
        new_react = CommentReaction(
            comment_id=comment_id,
            user_id=current_user.id,
            reaction_type=body.reaction_type,
        )
        db.add(new_react)
        active_reaction = body.reaction_type

    await db.commit()

    # Lấy lại tổng số reactions hiện tại
    react_query = (
        select(CommentReaction.reaction_type, func.count(CommentReaction.id))
        .where(CommentReaction.comment_id == comment_id)
        .group_by(CommentReaction.reaction_type)
    )
    counts = {"like": 0, "laugh": 0, "fire": 0, "shock": 0}
    for r_type, count in (await db.execute(react_query)).all():
        counts[r_type] = count

    return CommentReactionOut(
        comment_id=comment_id,
        user_id=current_user.id,
        reaction_type=active_reaction,
        reactions_count=counts,
    )
