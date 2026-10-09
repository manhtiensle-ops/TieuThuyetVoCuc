"""Module xử lý và chuẩn hóa văn bản tiếng Việt."""
import unicodedata
import re

def normalize_text(text: str | None) -> str:
    """
    Chuẩn hóa chuỗi tiếng Việt sang định dạng Unicode Dựng Sẵn (NFC).
    Khắc phục triệt để lỗi phân mảnh dấu thanh (NFD) khi cào từ nguồn ngoài.
    """
    if not text:
        return ""
    # Chuyển đổi mọi ký tự tổ hợp sang dựng sẵn
    normalized = unicodedata.normalize("NFC", text)
    # Chuẩn hóa khoảng trắng thừa nhưng bảo tồn cấu trúc đoạn văn / HTML
    return normalized

def remove_diacritics(text: str) -> str:
    """
    Loại bỏ dấu tiếng Việt phục vụ tạo search slug / không dấu search.
    VD: 'Tận Thế Du Hành Gia' -> 'tan the du hanh gia'
    """
    if not text:
        return ""
    # Decompose
    nfd = unicodedata.normalize("NFD", text)
    # Loại bỏ marks
    without_marks = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    # Thay thế đ/Đ
    without_marks = without_marks.replace("đ", "d").replace("Đ", "D")
    return without_marks.lower()

def slugify(text: str) -> str:
    """Tạo URL slug an toàn từ tiêu đề tiếng Việt."""
    cleaned = remove_diacritics(text)
    slug = re.sub(r'[^a-z0-9]+', '-', cleaned).strip('-')
    return slug or "truyen"


from pathlib import Path as _Path

def safe_novel_path(base_dir: _Path, slug: str) -> _Path:
    """
    Trả về Path an toàn cho thư mục novel, chặn path traversal.

    Defense-in-depth layer 2 (layer 1 = Pydantic slug validator):
    - resolve() chuyển đổi '../' và symlink thành đường dẫn tuyệt đối thực tế
    - is_relative_to() đảm bảo kết quả vẫn nằm trong base_dir
    - Raise ValueError nếu slug bị giả mạo (không bao giờ xảy ra nếu
      Pydantic validator hoạt động, nhưng giúp bắt lỗi lập trình).
    """
    candidate = (base_dir / slug).resolve()
    base_resolved = base_dir.resolve()
    if not candidate.is_relative_to(base_resolved):
        raise ValueError(
            f"Path traversal bị chặn: slug '{slug}' cố thoát khỏi '{base_resolved}'"
        )
    return candidate

