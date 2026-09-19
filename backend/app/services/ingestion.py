"""Module đồng bộ và import truyện hai chiều giữa Thư mục File (Markdown/Txt) và Database PostgreSQL."""
import os
import re
import json
import yaml
import markdown
from pathlib import Path
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.models.novel import Novel, NovelGenre, NovelTag
from app.models.chapter import Chapter
from app.core.text import normalize_text, remove_diacritics

def _slugify(text: str) -> str:
    cleaned = remove_diacritics(text)
    slug = re.sub(r"[^\w\s-]", "", cleaned).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)

def _html_to_markdown_or_clean(html_content: str) -> str:
    """Chuyển đổi các thẻ <p> đơn giản về đoạn văn bản Markdown sạch."""
    if not html_content:
        return ""
    # Thay thế </p> bằng 2 dòng ngắt
    text = re.sub(r"</p>\s*<p>", "\n\n", html_content)
    text = re.sub(r"^<p>|</p>$", "", text)
    return text.strip()

def _markdown_to_html(md_content: str) -> str:
    """Chuyển đổi Markdown hoặc văn bản thuần sang HTML có thẻ <p> chuẩn."""
    if not md_content:
        return ""
    # Nếu đã chứa thẻ HTML <p>, giữ nguyên sau khi chuẩn hóa
    if "<p>" in md_content and "</p>" in md_content:
        return normalize_text(md_content)
    
    # Dùng markdown parser để tạo HTML chuẩn
    html = markdown.markdown(md_content, extensions=['extra', 'nl2br'])
    # Đảm bảo các đoạn văn đều được bọc trong <p>
    if not html.startswith("<p>"):
        html = f"<p>{html}</p>"
    return normalize_text(html)

def _parse_chapter_file(file_path: Path) -> dict[str, Any]:
    """Đọc file chương (.md hoặc .txt), bóc tách Frontmatter và nội dung."""
    content_raw = file_path.read_text(encoding="utf-8")
    
    # 1. Trích xuất Frontmatter YAML nếu có
    frontmatter = {}
    body = content_raw.strip()
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", body, re.DOTALL)
    if fm_match:
        try:
            frontmatter = yaml.safe_load(fm_match.group(1)) or {}
            body = fm_match.group(2)
        except Exception:
            pass

    # 2. Xác định số chương và tiêu đề
    # Mẫu tên file: 001-ten-chuong.md hoặc chap-1.md hoặc 1.txt
    filename = file_path.stem
    number_from_name = None
    num_match = re.match(r"^(?:chap(?:ter)?[-_\s]*)?(\d+)", filename, re.IGNORECASE)
    if num_match:
        number_from_name = int(num_match.group(1))

    chapter_number = frontmatter.get("number", number_from_name or 1)
    
    # Tiêu đề từ frontmatter hoặc từ dòng đầu '# Tiêu đề' hoặc từ tên file
    title = frontmatter.get("title")
    if not title:
        first_line = body.strip().split("\n")[0] if body.strip() else ""
        if first_line.startswith("#"):
            title = first_line.lstrip("#").strip()
            # Xóa dòng tiêu đề khỏi body
            body = "\n".join(body.strip().split("\n")[1:])
        else:
            # Lấy phần còn lại của tên file
            title_part = re.sub(r"^(?:chap(?:ter)?[-_\s]*)?\d+[-_\s]*", "", filename)
            title = title_part.replace("-", " ").replace("_", " ").title() if title_part else f"Chương {chapter_number}"

    is_premium = bool(frontmatter.get("is_premium", False))
    html_content = _markdown_to_html(body)
    word_count = len(re.findall(r"\w+", re.sub(r"<[^>]+>", "", html_content)))

    return {
        "number": int(chapter_number),
        "title": normalize_text(title),
        "content": html_content,
        "word_count": word_count,
        "is_premium": is_premium,
    }

# ── 1. Xuất dữ liệu Database ra thư mục Folder ──────────────────────────────
async def export_db_to_folder(db: AsyncSession, data_dir: Path) -> dict:
    data_dir.mkdir(parents=True, exist_ok=True)
    
    result = await db.execute(
        select(Novel).options(selectinload(Novel.genres), selectinload(Novel.tags))
    )
    novels = result.scalars().all()

    novels_count = 0
    chapters_count = 0

    for novel in novels:
        novel_folder = data_dir / novel.slug
        novel_folder.mkdir(parents=True, exist_ok=True)

        # Ghi metadata.json
        meta = {
            "title": novel.title,
            "author": novel.author,
            "slug": novel.slug,
            "genres": [g.genre for g in novel.genres],
            "tags": [t.tag for t in novel.tags],
            "status": novel.status,
            "rating": novel.rating,
            "cover_url": novel.cover_url,
            "description": novel.description,
        }
        (novel_folder / "metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        novels_count += 1

        # Query chapters của truyện này
        ch_res = await db.execute(
            select(Chapter).where(Chapter.novel_id == novel.id).order_by(Chapter.number)
        )
        chapters = ch_res.scalars().all()

        # Ghi từng chương thành file .md
        for ch in chapters:
            safe_title = _slugify(ch.title)
            ch_filename = f"{ch.number:03d}-{safe_title}.md"
            md_body = _html_to_markdown_or_clean(ch.content)

            file_content = f"""---
number: {ch.number}
title: {ch.title}
is_premium: {str(ch.is_premium).lower()}
---

{md_body}
"""
            (novel_folder / ch_filename).write_text(file_content, encoding="utf-8")
            chapters_count += 1

    return {"novels_exported": novels_count, "chapters_exported": chapters_count}

# ── 2. Quét Thư mục Folder và Đồng bộ vào Database ──────────────────────────
async def sync_folder_to_db(db: AsyncSession, data_dir: Path) -> dict:
    if not data_dir.exists():
        return {"error": f"Thư mục {data_dir} không tồn tại", "novels_synced": 0, "chapters_synced": 0}

    novels_synced = 0
    chapters_synced = 0
    synced_details = []

    # Quét từng thư mục con (mỗi thư mục là một tiểu thuyết)
    novel_dirs = [d for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]

    for ndir in novel_dirs:
        slug = ndir.name
        meta_file = ndir / "metadata.json"
        meta = {}
        if meta_file.exists():
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        title = normalize_text(meta.get("title", slug.replace("-", " ").title()))
        author = normalize_text(meta.get("author", "Khuyết Danh"))
        description = normalize_text(meta.get("description", ""))
        cover_url = meta.get("cover_url")
        status = meta.get("status", "ongoing")
        genres = [normalize_text(g) for g in meta.get("genres", ["Huyền Huyễn"])]

        # Tìm hoặc tạo Novel trong DB
        novel = (await db.execute(
            select(Novel).options(selectinload(Novel.genres)).where(Novel.slug == slug)
        )).scalar_one_or_none()

        if not novel:
            novel = Novel(
                slug=slug,
                title=title,
                author=author,
                description=description,
                cover_url=cover_url,
                status=status,
                total_chapters=0,
            )
            db.add(novel)
            await db.flush()
        else:
            novel.title = title
            novel.author = author
            novel.description = description
            if cover_url:
                novel.cover_url = cover_url
            novel.status = status

        # Cập nhật Genres
        await db.execute(delete(NovelGenre).where(NovelGenre.novel_id == novel.id))
        for g in genres:
            if g.strip():
                db.add(NovelGenre(novel_id=novel.id, genre=g.strip()))

        # Cập nhật Tags
        tags = [normalize_text(t) for t in meta.get("tags", [])]
        await db.execute(delete(NovelTag).where(NovelTag.novel_id == novel.id))
        for t in tags:
            if t.strip():
                db.add(NovelTag(novel_id=novel.id, tag=t.strip()))

        await db.flush()

        # Quét các file chương (.md hoặc .txt)
        chapter_files = sorted(
            [f for f in ndir.iterdir() if f.is_file() and f.suffix.lower() in [".md", ".txt"] and not f.name.startswith(".")],
            key=lambda p: p.name,
        )

        ch_count = 0
        for cfile in chapter_files:
            parsed = _parse_chapter_file(cfile)
            ch_num = parsed["number"]

            # Kiểm tra chương đã có chưa
            chapter = (await db.execute(
                select(Chapter).where(Chapter.novel_id == novel.id, Chapter.number == ch_num)
            )).scalar_one_or_none()

            if chapter:
                chapter.title = parsed["title"]
                chapter.content = parsed["content"]
                chapter.word_count = parsed["word_count"]
                chapter.is_premium = parsed["is_premium"]
            else:
                chapter = Chapter(
                    novel_id=novel.id,
                    number=ch_num,
                    title=parsed["title"],
                    content=parsed["content"],
                    word_count=parsed["word_count"],
                    is_premium=parsed["is_premium"],
                )
                db.add(chapter)
            
            ch_count += 1
            chapters_synced += 1

        await db.flush()
        
        # Đếm lại tổng số chương trong DB
        total_ch = (await db.scalar(
            select(func.count(Chapter.id)).where(Chapter.novel_id == novel.id)
        )) or 0
        novel.total_chapters = total_ch

        novels_synced += 1
        synced_details.append({
            "novel": title,
            "slug": slug,
            "chapters_found": ch_count,
            "total_chapters": total_ch,
        })

    await db.commit()
    return {
        "novels_synced": novels_synced,
        "chapters_synced": chapters_synced,
        "details": synced_details,
    }
