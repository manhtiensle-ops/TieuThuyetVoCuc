from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.blocked_ip import BlockedIP
from app.core.settings import settings
from loguru import logger

# In-memory cache of blocked IPs for instant O(1) checks
_BLOCKED_IPS_SET: set[str] = set()

# Set các trusted proxy IP, load một lần từ settings
_TRUSTED_PROXIES: frozenset[str] = frozenset(settings.TRUSTED_PROXY_IPS)


async def load_blocked_ips():
    """Load blocked IPs into memory cache on server startup."""
    global _BLOCKED_IPS_SET
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BlockedIP.ip_address))
            ips = result.scalars().all()
            _BLOCKED_IPS_SET = set(ips)
            logger.info(f"🛡️ Loaded {len(_BLOCKED_IPS_SET)} blocked IPs into memory cache.")
    except Exception as e:
        logger.error(f"⚠️ Failed to load blocked IPs: {e}")


def get_client_ip(request: Request) -> str:
    """
    Trích xuất IP thực của client có xét đến reverse proxy.

    Nguyên tắc bảo mật:
    - CHỈ tin tưởng X-Forwarded-For / X-Real-IP khi request đến từ IP
      nằm trong danh sách TRUSTED_PROXY_IPS (cấu hình server-side).
    - Nếu request đến trực tiếp (không qua proxy tin cậy), luôn dùng
      request.client.host — không thể bị spoof bởi client.
    - Tránh trường hợp: client tự thêm X-Forwarded-For: <IP-nạn-nhân>
      → bị admin ban nhầm người vô tội.
    """
    peer_ip = request.client.host if request.client else "127.0.0.1"

    # Chỉ xử lý proxy headers khi peer đến từ trusted proxy
    if peer_ip in _TRUSTED_PROXIES:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # X-Forwarded-For: <client>, <proxy1>, <proxy2>
            # Lấy IP đầu tiên (client gốc), strip whitespace
            candidate = forwarded.split(",")[0].strip()
            if candidate:
                return candidate

        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    # Không phải trusted proxy → dùng peer IP trực tiếp
    return peer_ip


def is_ip_blocked(ip: str) -> bool:
    return ip in _BLOCKED_IPS_SET


def add_ip_to_cache(ip: str):
    _BLOCKED_IPS_SET.add(ip)


def remove_ip_from_cache(ip: str):
    _BLOCKED_IPS_SET.discard(ip)


class IPBlockMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = get_client_ip(request)
        if is_ip_blocked(client_ip):
            logger.warning(
                f"🚫 BLOCKED REQUEST from banned IP: {client_ip} on {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": (
                        "Địa chỉ IP của bạn đã bị cấm truy cập do vi phạm "
                        "quy định nền tảng. Vui lòng liên hệ ban quản trị."
                    )
                },
            )
        return await call_next(request)
