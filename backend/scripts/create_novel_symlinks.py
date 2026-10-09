#!/usr/bin/env python3
"""
create_novel_symlinks.py
━━━━━━━━━━━━━━━━━━━━━━━
Tạo symbolic link cho các truyện trong DB → thư mục data/novels/<slug>
và cập nhật ~/workspace/truyen/ làm thư mục tham chiếu nhanh.

Bảo mật:
  - os.path.realpath() để chống Path Traversal
  - Chỉ tạo symlink TRONG thư mục NOVELS_ROOT — không ra ngoài
  - Không overwrite symlink trỏ sai (xóa rồi tạo lại)

Usage:
  cd backend/
  .venv/bin/python3 scripts/create_novel_symlinks.py [--dry-run]
"""

import asyncio
import os
import sys
import argparse
from pathlib import Path

# ── Cấu hình đường dẫn ───────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).resolve().parent.parent.parent   # novel-platform/
NOVELS_ROOT   = BASE_DIR / "data" / "novels"                    # nơi chứa data truyện
QUICK_REF_DIR = Path.home() / "workspace" / "truyen"           # shortcut nhanh

# Thư mục nguồn truyện AI writer (novel-writer)
WRITER_ROOT   = Path.home() / "workspace" / "novel-writer"

# ── Helpers ───────────────────────────────────────────────────────────────────
def safe_symlink(link_path: Path, target: Path, dry_run: bool = False) -> str:
    """
    Tạo symlink an toàn — kiểm tra target không vượt ra ngoài cho phép.
    Trả về: 'created' | 'exists' | 'updated' | 'skipped'
    """
    # Resolve target thật
    real_target = target.resolve() if target.exists() else target.absolute()

    # Kiểm tra link_path không nằm ngoài NOVELS_ROOT (chống symlink attack)
    try:
        link_path.relative_to(NOVELS_ROOT)
    except ValueError:
        # Cho phép link trong QUICK_REF_DIR
        try:
            link_path.relative_to(QUICK_REF_DIR)
        except ValueError:
            print(f"  ⛔ BLOCKED: {link_path} nằm ngoài thư mục cho phép!")
            return "blocked"

    if link_path.exists() or link_path.is_symlink():
        if link_path.is_symlink():
            existing_target = link_path.resolve()
            if existing_target == real_target:
                return "exists"
            # Symlink trỏ sai → xóa và tạo lại
            print(f"  🔄 Update: {link_path.name} → {real_target}")
            if not dry_run:
                link_path.unlink()
            else:
                return "would_update"
        else:
            print(f"  ⚠️  Skip (là thư mục thật, không phải symlink): {link_path.name}")
            return "skipped"
    else:
        print(f"  ✅ Create: {link_path.name} → {real_target}")
        if dry_run:
            return "would_create"

    if not dry_run:
        link_path.parent.mkdir(parents=True, exist_ok=True)
        link_path.symlink_to(real_target)
        return "created"
    return "would_create"


def slugify_name(name: str) -> str:
    """Chuyển tên thư mục → slug ASCII (cho thư mục quick_ref)."""
    import unicodedata, re
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"[^\w\s-]", "", name).strip().lower()
    name = re.sub(r"[\s_]+", "-", name)
    name = re.sub(r"-+", "-", name)
    return name


async def sync_from_db(dry_run: bool):
    """Đọc tất cả Novel từ DB (hoặc fallback filesystem) và tạo symlink trong NOVELS_ROOT."""
    # Import app config
    sys.path.insert(0, str(Path(__file__).parent.parent))

    NOVELS_ROOT.mkdir(parents=True, exist_ok=True)

    stats = {"created": 0, "exists": 0, "updated": 0,
             "skipped": 0, "no_data_dir": 0}

    rows = []
    try:
        from app.db.session import AsyncSessionLocal
        from app.models.novel import Novel
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            rows = (await db.execute(select(Novel).order_by(Novel.id))).scalars().all()
        print(f"\n📚 Tìm thấy {len(rows)} truyện trong DB\n")
    except Exception as e:
        print(f"\n⚠️  Không thể kết nối DB ({e}). Chuyển sang chế độ scan filesystem...\n")
        # Quét trực tiếp các project từ novel-writer/autonomous_studio/projects
        STUDIO_PROJECTS = WRITER_ROOT / "autonomous_studio" / "projects"
        if STUDIO_PROJECTS.exists():
            class NovelObj:
                def __init__(self, nid, title, slug):
                    self.id = nid
                    self.title = title
                    self.slug = slug
            
            idx = 1
            for p in sorted(STUDIO_PROJECTS.iterdir()):
                if p.is_dir():
                    slug = p.name.replace("_", "-")
                    title = p.name.replace("_", " ").title()
                    rows.append(NovelObj(idx, title, slug))
                    idx += 1

    for novel in rows:
        slug = novel.slug
        link = NOVELS_ROOT / slug
        # Thư mục data thật (nếu có)
        data_dir = NOVELS_ROOT / slug

        print(f"[#{novel.id}] {novel.title[:40]} (slug={slug})")

        # Nếu đã là thư mục thật → không cần làm gì
        if data_dir.exists() and not data_dir.is_symlink():
            print(f"  📁 Đã có thư mục thật: {slug}/")
            stats["exists"] += 1
            continue

        # Tìm nguồn tương ứng trong novel-writer
        writer_match = _find_writer_dir(novel.title, slug)
        if writer_match:
            result = safe_symlink(link, writer_match, dry_run)
            stats[result.replace("would_", "")] = stats.get(result.replace("would_", ""), 0) + 1
        else:
            # Tạo thư mục placeholder rỗng
            if not data_dir.exists():
                if not dry_run:
                    data_dir.mkdir(parents=True, exist_ok=True)
                    (data_dir / ".placeholder").write_text(
                        f"# {novel.title}\nslug: {slug}\nid: {novel.id}\n"
                    )
                print(f"  📂 Tạo placeholder: {slug}/")
            stats["exists"] += 1

    return stats


def _find_writer_dir(title: str, slug: str) -> Path | None:
    """Tìm thư mục trong novel-writer hoặc autonomous_studio/projects khớp với tên truyện/slug."""
    if not WRITER_ROOT.exists():
        return None

    # Tìm trong autonomous_studio/projects trước
    STUDIO_PROJECTS = WRITER_ROOT / "autonomous_studio" / "projects"
    if STUDIO_PROJECTS.exists():
        for d in STUDIO_PROJECTS.iterdir():
            if not d.is_dir():
                continue
            d_slug = d.name.replace("_", "-")
            if d_slug == slug or d.name.lower() == title.lower().replace(" ", "_"):
                return d

    # 1. Khớp tên thư mục chính xác trong root
    for d in WRITER_ROOT.iterdir():
        if not d.is_dir():
            continue
        d_slug = slugify_name(d.name)
        if d_slug == slug or d.name.lower() == title.lower():
            return d

    # 2. Khớp một phần (slug chứa trong tên thư mục)
    slug_parts = set(slug.replace("-", " ").split())
    for d in WRITER_ROOT.iterdir():
        if not d.is_dir():
            continue
        d_lower = slugify_name(d.name)
        match_count = sum(1 for p in slug_parts if p in d_lower)
        if match_count >= max(2, len(slug_parts) // 2):
            return d

    return None


def sync_quick_ref(dry_run: bool):
    """
    Tạo/cập nhật ~/workspace/truyen/ với symlink đến tất cả
    thư mục/symlink trong data/novels/.
    """
    QUICK_REF_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n🔗 Đồng bộ quick-ref: {QUICK_REF_DIR}\n")

    created = 0
    for entry in sorted(NOVELS_ROOT.iterdir()):
        if entry.name.startswith("."):
            continue
        link = QUICK_REF_DIR / entry.name
        # Resolve target thực sự
        target = entry.resolve() if entry.exists() else entry
        result = safe_symlink(link, target, dry_run)
        if result in ("created", "would_create", "updated", "would_update"):
            created += 1

    print(f"\n  → {created} symlink mới/cập nhật trong {QUICK_REF_DIR}")


def print_summary(stats: dict):
    print("\n" + "━" * 50)
    print("📊 Kết quả:")
    print(f"  ✅ Tạo mới  : {stats.get('created', 0)}")
    print(f"  🔄 Cập nhật : {stats.get('updated', 0)}")
    print(f"  📁 Đã tồn tại: {stats.get('exists', 0)}")
    print(f"  ⚠️  Bỏ qua   : {stats.get('skipped', 0)}")
    print("━" * 50)


async def main():
    parser = argparse.ArgumentParser(description="Tạo symlink cho truyện trong novel-platform")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ xem, không tạo file")
    args = parser.parse_args()

    if args.dry_run:
        print("🧪 DRY RUN — không thay đổi filesystem\n")

    print(f"📁 NOVELS_ROOT  : {NOVELS_ROOT}")
    print(f"🔗 QUICK_REF    : {QUICK_REF_DIR}")
    print(f"✏️  WRITER_ROOT  : {WRITER_ROOT}")

    # 1. Đồng bộ từ DB → data/novels/
    stats = await sync_from_db(args.dry_run)

    # 2. Đồng bộ data/novels/ → ~/workspace/truyen/
    sync_quick_ref(args.dry_run)

    print_summary(stats)

    # 3. Liệt kê kết quả cuối
    print("\n📂 Trạng thái data/novels/:")
    for entry in sorted(NOVELS_ROOT.iterdir()):
        if entry.name.startswith("."):
            continue
        if entry.is_symlink():
            print(f"  🔗 {entry.name}  →  {os.readlink(entry)}")
        elif entry.is_dir():
            print(f"  📁 {entry.name}/")

    print("\n📂 Trạng thái ~/workspace/truyen/:")
    for entry in sorted(QUICK_REF_DIR.iterdir()):
        if entry.name.startswith("."):
            continue
        if entry.is_symlink():
            print(f"  🔗 {entry.name}  →  {os.readlink(entry)}")
        elif entry.is_dir():
            print(f"  📁 {entry.name}/")


if __name__ == "__main__":
    asyncio.run(main())
