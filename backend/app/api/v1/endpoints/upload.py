import os
import io
import uuid
from pathlib import Path
from PIL import Image, ImageOps
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

# UPLOAD_DIR points directly to app/static/uploads/covers
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "static" / "uploads" / "covers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # Cho phép tối đa 10MB trước khi nén


class UrlUploadInput(BaseModel):
    url: str


def _process_and_save_image(image_bytes: bytes) -> tuple[str, int, int, int]:
    """Xác thực định dạng ảnh qua Pillow, tự động xoay chuẩn EXIF, nén sang WebP và lưu trữ."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Tệp tải lên không phải là hình ảnh hợp lệ hoặc đã bị lỗi",
        )

    # Chuẩn hóa hướng ảnh từ metadata EXIF
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Kích thước tối đa chuẩn bìa sách (chiều rộng tối đa 1200px, chiều cao tối đa 1800px)
    max_w, max_h = 1200, 1800
    if image.width > max_w or image.height > max_h:
        image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    # Chuyển đổi định dạng phù hợp sang WebP
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        # Giữ độ trong suốt nếu có
        image = image.convert("RGBA")
    else:
        image = image.convert("RGB")

    unique_filename = f"{uuid.uuid4().hex}.webp"
    dest_path = UPLOAD_DIR / unique_filename

    # Nén WebP chất lượng cao (quality=85)
    image.save(dest_path, format="WEBP", quality=85, method=4)
    file_size = dest_path.stat().st_size

    return unique_filename, image.width, image.height, file_size


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
            detail=f"Định dạng ảnh không hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Dung lượng ảnh vượt quá 10MB")

    filename, width, height, size = _process_and_save_image(content)

    return {
        "url": f"/uploads/covers/{filename}",
        "filename": filename,
        "width": width,
        "height": height,
        "size": size,
    }


@router.post("/from-url")
async def upload_from_url(
    payload: UrlUploadInput,
    current_user: User = Depends(get_current_user),
):
    url = payload.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)")

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Không thể tải ảnh từ URL (Mã lỗi HTTP {resp.status_code})",
                )

            content_type = resp.headers.get("content-type", "").lower()
            if "text/html" in content_type:
                raise HTTPException(
                    status_code=400,
                    detail="Liên kết này là trang web (HTML), không phải là tệp hình ảnh trực tiếp",
                )

            content = resp.content
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="Dung lượng ảnh từ URL vượt quá 10MB")

            filename, width, height, size = _process_and_save_image(content)

            return {
                "url": f"/uploads/covers/{filename}",
                "filename": filename,
                "width": width,
                "height": height,
                "size": size,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi tải ảnh từ đường dẫn: {str(e)}")
