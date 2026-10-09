"""
token_blacklist.py — Access token blacklist sau khi logout

Chiến lược:
  - Lưu JTI (JWT ID) vào Redis với TTL = thời gian còn lại của token
  - Mọi request có token bị blacklist → 401 ngay lập tức
  - Redis down → fallback in-memory set (mất khi restart, acceptable)
  - Không lưu token string thô — chỉ lưu JTI (UUID nhỏ gọn, an toàn hơn)

Tại sao cần JTI thay vì lưu token string:
  - Token string dài ~200 chars; JTI là UUID 36 chars → tiết kiệm Redis memory
  - JTI được embed trong payload khi tạo token (thêm claim "jti")
  - Nếu chưa có "jti" trong token cũ → dùng hash(token) làm key fallback
"""

import time
import hashlib
from typing import Optional
from loguru import logger


# ── In-memory fallback (dùng khi Redis không khả dụng) ──────────────────────
# Set of (key, expire_timestamp) — xóa expired entries khi check
_MEM_BLACKLIST: set[tuple[str, float]] = set()
_MEM_MAX_SIZE = 10_000  # giới hạn để tránh memory leak nếu Redis down lâu


def _mem_add(key: str, ttl_seconds: int) -> None:
    global _MEM_BLACKLIST
    expire_at = time.time() + ttl_seconds
    # Dọn expired entries trước khi thêm
    now = time.time()
    _MEM_BLACKLIST = {(k, exp) for k, exp in _MEM_BLACKLIST if exp > now}
    if len(_MEM_BLACKLIST) < _MEM_MAX_SIZE:
        _MEM_BLACKLIST.add((key, expire_at))


def _mem_exists(key: str) -> bool:
    now = time.time()
    return any(k == key and exp > now for k, exp in _MEM_BLACKLIST)


# ── Public API ────────────────────────────────────────────────────────────────

def _token_key(token: str, jti: Optional[str]) -> str:
    """Ưu tiên JTI; fallback sha256 prefix của token string."""
    if jti:
        return f"bl:jti:{jti}"
    return f"bl:tok:{hashlib.sha256(token.encode()).hexdigest()[:32]}"


async def blacklist_token(token: str, jti: Optional[str], ttl_seconds: int) -> None:
    """
    Thêm token vào blacklist với TTL còn lại của nó.
    Được gọi tại endpoint /logout.

    Args:
        token:       JWT string (dùng để tạo fallback key nếu không có jti)
        jti:         JWT ID claim từ payload (preferred key)
        ttl_seconds: giây còn lại trước khi token expire tự nhiên
    """
    if ttl_seconds <= 0:
        return  # Token đã expired tự nhiên, không cần blacklist

    key = _token_key(token, jti)

    try:
        from app.core.redis import get_redis
        r = await get_redis()
        if r is not None:
            await r.setex(key, ttl_seconds, "1")
            logger.debug(f"Blacklisted token key={key} ttl={ttl_seconds}s (Redis)")
            return
    except Exception as e:
        logger.warning(f"Redis blacklist write failed: {e}")

    # Fallback in-memory
    _mem_add(key, ttl_seconds)
    logger.warning(f"Blacklisted token key={key} ttl={ttl_seconds}s (in-memory fallback)")


async def is_blacklisted(token: str, jti: Optional[str]) -> bool:
    """
    Kiểm tra token có trong blacklist không.
    Được gọi tại get_current_user dependency mỗi request có token.

    Returns True nếu token đã bị revoke.
    """
    key = _token_key(token, jti)

    try:
        from app.core.redis import get_redis
        r = await get_redis()
        if r is not None:
            return bool(await r.exists(key))
    except Exception as e:
        logger.warning(f"Redis blacklist read failed: {e}")

    # Fallback in-memory
    return _mem_exists(key)
