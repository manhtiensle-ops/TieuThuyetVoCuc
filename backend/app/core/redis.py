import redis.asyncio as aioredis
from app.core.settings import settings
import logging

logger = logging.getLogger(__name__)

redis_client: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis | None:
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await redis_client.ping()
        except Exception as e:
            logger.warning(f"⚠️ Không thể kết nối Redis ({e}). Dùng in-memory fallback.")
            redis_client = None
    return redis_client
