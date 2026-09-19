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

