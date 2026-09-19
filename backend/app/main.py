from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.settings import settings
from app.api.v1.endpoints import auth, novels, chapters, admin, upload
from app.core.ip_ban import IPBlockMiddleware, load_blocked_ips
from loguru import logger

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# Static directory for uploads (covers, illustrations)
STATIC_DIR = Path(__file__).resolve().parent / "static" / "uploads"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(STATIC_DIR)), name="uploads")

# Security & IP blocking middleware (runs first)
app.add_middleware(IPBlockMiddleware)

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
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}

@app.on_event("startup")
async def startup():
    logger.info(f"🚀 {settings.APP_NAME} khởi động")
    await load_blocked_ips()
