import io
import ipaddress
import socket
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from PIL import Image, ImageOps
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

# UPLOAD_DIR points directly to app/static/uploads/covers
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "static" / "uploads" / "covers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024    # 5 MB — giảm từ 10MB để tránh spike RAM khi decode ảnh lớn
MAX_IMAGE_DIMENSION = 5_000        # giảm từ 10_000px — ảnh 10kx10k = 400MB RAM khi decode

# ── Magic bytes của các định dạng ảnh hợp lệ ────────────────────────
# Format: (offset, bytes_to_match)
_IMAGE_MAGIC: list[tuple[int, bytes]] = [
    (0, b"\xff\xd8\xff"),               # JPEG
    (0, b"\x89PNG\r\n\x1a\n"),          # PNG
    (0, b"GIF87a"),                     # GIF87
    (0, b"GIF89a"),                     # GIF89
    (0, b"RIFF"),                       # WebP (tiếp tục check offset 8)
    (8, b"WEBP"),                       # WebP signature tại offset 8
]

# Private / reserved IP ranges bị chặn để ngăn SSRF
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),         # IPv6 link-local
]


def _is_private_ip(host: str) -> bool:
    """Trả True nếu host resolve về IP private/reserved."""
    try:
        addr = ipaddress.ip_address(host)
        return any(addr in net for net in _BLOCKED_NETWORKS)
    except ValueError:
        pass
    # host là domain → resolve DNS
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            raw_ip = info[4][0]
            try:
                addr = ipaddress.ip_address(raw_ip)
                if any(addr in net for net in _BLOCKED_NETWORKS):
                    return True
            except ValueError:
                continue
    except OSError:
        pass
    return False


def _check_image_magic_bytes(data: bytes) -> bool:
    """
    Kiểm tra magic bytes — trả True nếu data khớp ít nhất một
    signature của định dạng ảnh hợp lệ.

    WebP cần khớp CẢ HAI: offset-0 = 'RIFF' VÀ offset-8 = 'WEBP'.
    Các format khác chỉ cần khớp 1 signature.
    """
    if len(data) < 12:
        return False

    # JPEG, PNG, GIF
    for offset, sig in _IMAGE_MAGIC:
        if offset == 8:
            continue  # WebP offset-8 xử lý riêng bên dưới
        end = offset + len(sig)
        if data[offset:end] == sig:
            # WebP: RIFF header phải kèm WEBP tại offset 8
            if sig == b"RIFF":
                return data[8:12] == b"WEBP"
            return True

    return False


def _process_and_save_image(image_bytes: bytes) -> tuple[str, int, int, int]:
    """
    Xác thực magic bytes, mở ảnh qua Pillow, chống decompression bomb,
    chuẩn hóa EXIF, nén sang WebP và lưu trữ.
    """
    # [FIX] Magic bytes check TRƯỚC khi mở bằng Pillow
    if not _check_image_magic_bytes(image_bytes):
        raise HTTPException(
            status_code=400,
            detail="Tệp không phải định dạng ảnh hợp lệ (sai magic bytes)",
        )

    try:
        image = Image.open(io.BytesIO(image_bytes))
        # [FIX] Chống decompression bomb — giới hạn kích thước tối đa
        image.verify()   # verify() detect truncated/corrupt images
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Tệp tải lên không phải là hình ảnh hợp lệ hoặc đã bị lỗi",
        )

    # Mở lại sau verify() vì verify() làm file pointer về cuối
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Không thể đọc dữ liệu ảnh",
        )

    # [FIX] Chống decompression bomb (PNG/GIF độc hại với kích thước khổng lồ)
    if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Kích thước ảnh quá lớn (tối đa {MAX_IMAGE_DIMENSION}px mỗi chiều)",
        )

    # Chuẩn hóa hướng ảnh từ metadata EXIF
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Kích thước tối đa chuẩn bìa sách
    max_w, max_h = 1200, 1800
    if image.width > max_w or image.height > max_h:
        image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    # Chuyển đổi định dạng sang WebP
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
    else:
        image = image.convert("RGB")

    unique_filename = f"{uuid.uuid4().hex}.webp"
    dest_path = UPLOAD_DIR / unique_filename
    image.save(dest_path, format="WEBP", quality=85, method=4)
    file_size = dest_path.stat().st_size

    return unique_filename, image.width, image.height, file_size


class UrlUploadInput(BaseModel):
    url: str


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

    # [FIX] Validate scheme — chỉ cho phép https/http công khai
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ (chỉ chấp nhận http:// hoặc https://)",
        )

    host = parsed.hostname or ""
    if not host:
        raise HTTPException(status_code=400, detail="URL thiếu hostname")

    # [FIX] SSRF prevention — block private/reserved IP ranges
    # Resolve DNS sớm, trước khi mở kết nối
    if _is_private_ip(host):
        raise HTTPException(
            status_code=400,
            detail="URL trỏ đến địa chỉ nội bộ không được phép",
        )

    try:
        async with httpx.AsyncClient(
            timeout=12.0,
            follow_redirects=False,   # [FIX] Không follow redirect — tránh open redirect → SSRF
        ) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; NovelPlatformBot/1.0)"
                    )
                },
            )

            # [FIX] Xử lý redirect thủ công — kiểm tra IP đích trước khi follow
            if resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("location", "")
                if not location:
                    raise HTTPException(status_code=400, detail="Redirect không hợp lệ")
                redirect_parsed = urlparse(location)
                redirect_host = redirect_parsed.hostname or ""
                if _is_private_ip(redirect_host):
                    raise HTTPException(
                        status_code=400,
                        detail="URL chuyển hướng đến địa chỉ nội bộ không được phép",
                    )
                # Cho phép follow nếu host đích là public
                resp = await client.get(
                    location,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; NovelPlatformBot/1.0)"},
                )

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Không thể tải ảnh từ URL (HTTP {resp.status_code})",
                )

            content = resp.content
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="Dung lượng ảnh từ URL vượt quá 10MB")

            # _process_and_save_image đã tích hợp magic bytes check
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
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi khi tải ảnh từ đường dẫn: {str(e)}",
        )
