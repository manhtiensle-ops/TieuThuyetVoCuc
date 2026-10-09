"""
security_headers.py — Starlette middleware thêm HTTP security headers

Headers được thiết lập:
  Content-Security-Policy    — chặn inline script/style injection (XSS)
  Strict-Transport-Security  — ép HTTPS (production)
  X-Frame-Options            — chặn clickjacking qua iframe
  X-Content-Type-Options     — chặn MIME sniffing
  Referrer-Policy            — giới hạn referer gửi ra ngoài
  Permissions-Policy         — tắt các browser API không cần thiết
  X-XSS-Protection           — backward compat (IE/old Edge)
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.settings import settings


# CSP production — chặn inline scripts, chỉ cho phép resource từ same-origin
# và CDN đã khai báo. Thêm nonce-based nếu cần inline script sau này.
_CSP_PRODUCTION = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "   # unsafe-inline cần cho Tailwind CSS-in-JS
    "img-src 'self' data: blob: https:; "   # ảnh bìa truyện từ CDN ngoài
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "             # thay thế X-Frame-Options trong CSP2+
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self';"
)

# CSP development — nới lỏng hơn để Vite HMR hoạt động
_CSP_DEVELOPMENT = (
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss:; "
    "img-src 'self' data: blob: https:; "
    "connect-src 'self' ws: wss: http://localhost:*;"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Thêm 7 security headers vào mọi HTTP response.
    Tự động chọn CSP lỏng hơn khi DEBUG=True để không phá Vite HMR.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # 1. Content-Security-Policy
        csp = _CSP_DEVELOPMENT if settings.DEBUG else _CSP_PRODUCTION
        response.headers["Content-Security-Policy"] = csp

        # 2. Strict-Transport-Security
        # max-age=31536000 = 1 năm; includeSubDomains bắt buộc theo HSTS preload
        # Chỉ thêm trên production (HTTPS) — dev thường chạy HTTP
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # 3. X-Frame-Options — legacy fallback (CSP frame-ancestors đã cover)
        response.headers["X-Frame-Options"] = "DENY"

        # 4. X-Content-Type-Options — chặn MIME sniffing
        # Quan trọng: ngăn browser chạy file upload (ảnh/txt) như JS/HTML
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 5. Referrer-Policy — chỉ gửi origin (không path/query) khi cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 6. Permissions-Policy — tắt các API browser không dùng
        # Tắt: camera, microphone, geolocation, payment, usb
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), interest-cohort=()"
        )

        # 7. X-XSS-Protection — backward compat cho IE/old Edge
        # mode=block ngăn render page khi phát hiện XSS (deprecated nhưng harmless)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response
