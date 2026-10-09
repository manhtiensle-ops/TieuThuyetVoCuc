from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from app.core.settings import settings
from app.api.v1.endpoints import auth, novels, chapters, admin, upload, comments, progress, subscription, dashboard
from app.core.ip_ban import IPBlockMiddleware, load_blocked_ips
from app.core.security_headers import SecurityHeadersMiddleware
from loguru import logger

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# Mount SlowAPI limiter — rate limit handler trả 429 với message tiếng Việt
app.state.limiter = auth.limiter

async def _handle_rate_limit(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Quá nhiều yêu cầu. Vui lòng thử lại sau."},
    )

app.add_exception_handler(RateLimitExceeded, _handle_rate_limit)

# Static directory for uploads (covers, illustrations)
STATIC_DIR = Path(__file__).resolve().parent / "static" / "uploads"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(STATIC_DIR)), name="uploads")

# Security & IP blocking middleware (runs first)
app.add_middleware(IPBlockMiddleware)

# Security headers — thêm vào mọi response
app.add_middleware(SecurityHeadersMiddleware)

# GZip — nén response >= 1KB (chapter text, novel list)
# minimum_size=1024: response nhỏ (<1KB) không nén để tránh overhead
app.add_middleware(GZipMiddleware, minimum_size=1024)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(novels.router, prefix="/api/v1")
app.include_router(chapters.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(subscription.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}

@app.on_event("startup")
async def startup():
    logger.info(f"🚀 {settings.APP_NAME} khởi động")
    await load_blocked_ips()
