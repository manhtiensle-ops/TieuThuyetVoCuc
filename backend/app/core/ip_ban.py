from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.blocked_ip import BlockedIP
from loguru import logger

# In-memory cache of blocked IPs for instant O(1) checks
_BLOCKED_IPS_SET: set[str] = set()

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
    """Extract client IP address considering reverse proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in comma-separated chain
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

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
            logger.warning(f"🚫 BLOCKED REQUEST from banned IP: {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Địa chỉ IP của bạn đã bị cấm truy cập do vi phạm quy định nền tảng. Vui lòng liên hệ ban quản trị."
                }
            )
        return await call_next(request)
