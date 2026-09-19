"""Script CLI đồng bộ hai chiều giữa thư mục data/novels/ và Database."""
import sys
import asyncio
from pathlib import Path
from app.db.session import AsyncSessionLocal
from app.services.ingestion import export_db_to_folder, sync_folder_to_db

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "novels"

async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "import"
    
    print(f"📁 Thư mục dữ liệu: {DATA_DIR}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    async with AsyncSessionLocal() as db:
        if mode == "export":
            print("🚀 Đang xuất dữ liệu từ PostgreSQL ra các file Markdown...")
            res = await export_db_to_folder(db, DATA_DIR)
            print(f"✅ Đã xuất {res['novels_exported']} tiểu thuyết và {res['chapters_exported']} chương thành công!")
        else:
            print("📥 Đang quét thư mục data/novels/ và đồng bộ vào PostgreSQL...")
            res = await sync_folder_to_db(db, DATA_DIR)
            print(f"✅ Đồng bộ thành công: {res['novels_synced']} tiểu thuyết, {res['chapters_synced']} chương.")
            for d in res.get("details", []):
                print(f"   - {d['novel']} ({d['slug']}): {d['chapters_found']} files chương -> Tổng: {d['total_chapters']} chương trong DB")

if __name__ == "__main__":
    asyncio.run(main())
