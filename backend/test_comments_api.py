import asyncio
import httpx
from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def test_comments_flow():
    # 1. Tạo JWT token cho user 1
    token = create_access_token(1)
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        print("1. Kiểm tra GET /chapters/6/comments/summary...")
        res = await client.get("/chapters/6/comments/summary")
        print("   Summary status:", res.status_code, res.json())
        assert res.status_code == 200

        print("\n2. Kiểm tra POST /chapters/6/comments (bình luận đoạn văn idx=1)...")
        res = await client.post("/chapters/6/comments", headers=headers, json={
            "content": "Đoạn văn này tác giả miêu tả rất chân thực và có lực!",
            "paragraph_index": 1,
            "is_spoiler": False
        })
        print("   Create status:", res.status_code, res.json())
        assert res.status_code == 201
        cmt1 = res.json()
        cmt1_id = cmt1["id"]

        print("\n3. Kiểm tra POST /chapters/6/comments (bình luận chân chương)...")
        # Chờ 5.1s để qua rate-limit
        await asyncio.sleep(5.2)
        res = await client.post("/chapters/6/comments", headers=headers, json={
            "content": "Chương 1 mở đầu quá cuốn hút. Hóng chương tiếp theo!",
            "paragraph_index": None,
            "is_spoiler": False
        })
        print("   Create chapter comment status:", res.status_code, res.json())
        assert res.status_code == 201
        cmt2 = res.json()
        cmt2_id = cmt2["id"]

        print("\n4. Kiểm tra POST /chapters/6/comments (reply cho cmt1)...")
        await asyncio.sleep(5.2)
        res = await client.post("/chapters/6/comments", headers=headers, json={
            "content": "Đồng quan điểm với đạo hữu bên trên!",
            "parent_id": cmt1_id,
            "is_spoiler": False
        })
        print("   Create reply status:", res.status_code, res.json())
        assert res.status_code == 201

        print("\n5. Kiểm tra POST /comments/{id}/react (Thả tim ❤️)...")
        res = await client.post(f"/comments/{cmt1_id}/react", headers=headers, json={"reaction_type": "like"})
        print("   React status:", res.status_code, res.json())
        assert res.status_code == 200
        assert res.json()["reaction_type"] == "like"
        assert res.json()["reactions_count"]["like"] == 1

        print("\n6. Kiểm tra đổi cảm xúc sang 🔥 fire...")
        res = await client.post(f"/comments/{cmt1_id}/react", headers=headers, json={"reaction_type": "fire"})
        print("   Switch react status:", res.status_code, res.json())
        assert res.status_code == 200
        assert res.json()["reaction_type"] == "fire"
        assert res.json()["reactions_count"]["like"] == 0
        assert res.json()["reactions_count"]["fire"] == 1

        print("\n7. Kiểm tra GET /chapters/6/comments?paragraph_index=1...")
        res = await client.get("/chapters/6/comments?paragraph_index=1", headers=headers)
        print("   List paragraph comments status:", res.status_code)
        data = res.json()
        print("   Total items:", data["total"])
        assert len(data["items"]) >= 1
        item = data["items"][0]
        assert item["replies_count"] >= 1
        print("   Root comment content:", item["content"])
        print("   Replies count:", item["replies_count"], "First reply:", item["replies"][0]["content"])
        print("   Reactions count:", item["reactions_count"], "My reaction:", item["my_reaction"])

        print("\n8. Kiểm tra GET summary cập nhật...")
        res = await client.get("/chapters/6/comments/summary")
        print("   Summary after adds:", res.json())
        summary = res.json()
        assert summary["paragraph_counts"].get("1", 0) >= 1
        assert summary["chapter_comments_count"] >= 1

        print("\n9. Kiểm tra DELETE /comments/{id}...")
        res = await client.delete(f"/comments/{cmt2_id}", headers=headers)
        print("   Delete status:", res.status_code, res.json())
        assert res.status_code == 200

        print("\n✅ TẤT CẢ TEST ĐỀU THÀNH CÔNG RỰC RỠ!")

if __name__ == "__main__":
    asyncio.run(test_comments_flow())
