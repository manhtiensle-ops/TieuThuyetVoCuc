"""
chapter_cache.py — Redis cache cho nội dung chapter

Cache key strategy:
  ch:{slug}:{number}:free     — chapter không premium, TTL 1h
  ch:{slug}:{number}:premium  — chapter premium full content, TTL 1h
  (chapter bị locked/preview không cache — phụ thuộc user state)

Invalidation:
  invalidate_chapter(slug, number) — xóa cả 2 variant
  invalidate_novel_chapters(slug)  — xóa toàn bộ chapters của 1 novel (khi sửa hàng loạt)
"""

import json
import logging
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

CHAPTER_TTL = 3600  # 1 giờ


def _key(slug: str, number: int, variant: str) -> str:
    return f"ch:{slug}:{number}:{variant}"


async def get_cached_chapter(slug: str, number: int, variant: str) -> dict | None:
    """Lấy chapter từ Redis cache. Trả None nếu miss hoặc Redis down."""
    try:
        redis = await get_redis()
        if not redis:
            return None
        data = await redis.get(_key(slug, number, variant))
        if data:
            logger.debug(f"[Cache HIT] ch:{slug}:{number}:{variant}")
            return json.loads(data)
    except Exception as e:
        logger.warning(f"[Cache] get error: {e}")
    return None


async def set_cached_chapter(slug: str, number: int, variant: str, payload: dict) -> None:
    """Ghi chapter vào Redis với TTL. Silent fail nếu Redis down."""
    try:
        redis = await get_redis()
        if not redis:
            return
        await redis.setex(_key(slug, number, variant), CHAPTER_TTL, json.dumps(payload, ensure_ascii=False))
        logger.debug(f"[Cache SET] ch:{slug}:{number}:{variant} TTL={CHAPTER_TTL}s")
    except Exception as e:
        logger.warning(f"[Cache] set error: {e}")


async def invalidate_chapter(slug: str, number: int) -> None:
    """Xóa cache chapter sau khi admin sửa/xóa nội dung."""
    try:
        redis = await get_redis()
        if not redis:
            return
        keys = [_key(slug, number, "free"), _key(slug, number, "premium")]
        deleted = await redis.delete(*keys)
        logger.info(f"[Cache INVALIDATE] ch:{slug}:{number} — {deleted} keys deleted")
    except Exception as e:
        logger.warning(f"[Cache] invalidate error: {e}")


async def invalidate_novel_chapters(slug: str) -> None:
    """Xóa toàn bộ chapter cache của 1 novel (dùng khi bulk-update)."""
    try:
        redis = await get_redis()
        if not redis:
            return
        pattern = f"ch:{slug}:*"
        cursor = 0
        total = 0
        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            if keys:
                await redis.delete(*keys)
                total += len(keys)
            if cursor == 0:
                break
        logger.info(f"[Cache INVALIDATE] novel:{slug} — {total} chapter keys deleted")
    except Exception as e:
        logger.warning(f"[Cache] invalidate_novel error: {e}")
