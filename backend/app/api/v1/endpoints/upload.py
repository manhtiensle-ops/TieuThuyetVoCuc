import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "static" / "uploads" / "covers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/image")
async def upload_cover_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ảnh không hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Dung lượng ảnh vượt quá 5MB")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = UPLOAD_DIR / unique_filename

    with open(dest_path, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/covers/{unique_filename}",
        "filename": unique_filename,
        "size": len(content),
    }
