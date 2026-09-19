"""Seed dữ liệu mẫu cho novel platform."""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.settings import settings
from app.models.user import User
from app.models.novel import Novel, NovelGenre
from app.models.chapter import Chapter
from app.core.security import hash_password
from app.core.text import normalize_text

engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NOVELS = [
    {
        "slug": "tan-the-du-hanh-gia",
        "title": "Tận Thế Du Hành Gia",
        "author": "Triệu Thiên Vũ",
        "description": "Thế giới sụp đổ. Tạ Lâm — kẻ duy nhất sở hữu hệ thống Du Hành — trở về quá khứ mang theo ký ức của ngày tận thế. Nhưng lần này, hắn không chỉ sống sót. Hắn sẽ thay đổi tất cả.",
        "status": "ongoing",
        "views": 98400,
        "rating": 4.8,
        "genres": ["Huyền Huyễn", "Hệ Thống", "Tận Thế"],
        "chapters": [
            {"number": 1, "title": "Ngày Tận Thế Thứ Ba Trăm", "content": "<p>Năm 2047. Bầu trời Hà Nội đỏ rực như máu.</p><p>Tạ Lâm ngồi trên đống đổ nát của tòa nhà mình từng gọi là nhà, nhìn xuống thành phố đã thành địa ngục. Ba trăm ngày kể từ khi cổng thứ nguyên mở ra — ba trăm ngày kẻ sống đếm từng hơi thở.</p><p>Trước mắt hắn, con số đếm ngược nhấp nháy lần cuối: <strong>00:00:01</strong>.</p><p>Hắn không né tránh. Hắn đã quá mệt để né tránh.</p><p>Ánh sáng trắng xóa nuốt chửng mọi thứ.</p><p>Rồi — đau.</p><p>Không phải cái chết. Là ký ức. Tất cả ký ức ba trăm ngày ập vào như thác lũ, và Tạ Lâm tỉnh dậy trong phòng ngủ cũ của mình, mồ hôi ướt đẫm, tim đập loạn.</p><p>Điện thoại trên bàn hiện ngày: <em>15 tháng 3 năm 2047</em>.</p><p>Ngày cổng thứ nguyên chưa mở.</p>", "word_count": 950},
            {"number": 2, "title": "Hệ Thống Thức Tỉnh", "content": "<p>Tạ Lâm ngồi im mười phút, để não bộ sắp xếp lại những gì vừa xảy ra.</p><p>Hắn không điên. Hắn biết mình không điên, bởi vì kẻ điên không nhớ chính xác từng viên đạn đã bắn ra trong ba trăm ngày đó, không nhớ mùi của thành phố cháy, không nhớ khuôn mặt của từng người đã chết trước mắt mình.</p><p>Và hắn nhớ tất cả.</p><p><em>[Hệ Thống Du Hành Thức Tỉnh]</em></p><p><em>[Người dùng: Tạ Lâm | Cấp độ: 1 | Điểm Du Hành: 0]</em></p><p><em>[Nhiệm vụ đầu tiên: Sống sót qua ngày đầu tiên của Thảm Họa. Phần thưởng: Kỹ năng ngẫu nhiên SR]</em></p><p>Hắn nhìn chằm chằm vào bảng thông báo nổi lơ lửng trước mắt — thứ mà người thường không thể nhìn thấy.</p><p>Lần trước, hắn mất ba tuần mới có được hệ thống này. Giờ nó đã ở đây từ ngày đầu tiên.</p><p><em>Thú vị.</em></p>", "word_count": 1200},
            {"number": 3, "title": "Chuẩn Bị Trước Bình Minh", "content": "<p>Sáu tiếng đồng hồ.</p><p>Đó là thời gian Tạ Lâm có trước khi cổng thứ nguyên đầu tiên xuất hiện tại Hồ Tây lúc 3 giờ chiều.</p><p>Hắn không lãng phí một giây.</p><p>Trước hết — tiền. Tài khoản ngân hàng của hắn có vừa đủ để mua những thứ cần thiết nhất: dao bổ củi, đèn pin dự phòng, pin sạc, thuốc kháng sinh, và — quan trọng nhất — bản đồ tòa nhà của khu Đống Đa in sẵn ra giấy. Internet sẽ sập trong vòng ba tiếng sau khi cổng mở.</p><p>Mẹ hắn gọi xuống ăn sáng khi hắn đang nhét đồ vào ba lô.</p><p>— Lâm ơi, ăn trước đi con.</p><p>Hắn dừng lại. Lần trước, hắn đã không kịp nói lời tạm biệt.</p><p>Hắn xuống ăn sáng. Và lần này, hắn ăn rất chậm.</p>", "word_count": 1100},
        ]
    },
    {
        "slug": "ha-dong-dong-va-con-duong-chu-bac",
        "title": "Hạ Đồng Đồng Và Con Đường Chữ Bạc",
        "author": "Liễu Trường Thanh",
        "description": "Hạ Đồng Đồng sinh ra ở làng Mực — nơi người ta viết chữ bằng tâm huyết và chữ có thể thay đổi số phận. Khi quyển sách định mệnh của nàng bị người ta đốt cháy, nàng bắt đầu cuộc hành trình tìm lại những gì đã mất, với cây bút thừa kế từ tổ tiên và một bí mật mà ngay cả trời cũng không biết.",
        "status": "ongoing",
        "views": 72300,
        "rating": 4.7,
        "genres": ["Tiên Hiệp", "Ngôn Tình", "Huyền Huyễn"],
        "chapters": [
            {"number": 1, "title": "Làng Mực Và Cuốn Sách Đỏ", "content": "<p>Làng Mực không có tên trên bản đồ.</p><p>Nó nằm ở nơi núi rừng phân định với đồng bằng — một ranh giới mà người dưới xuôi gọi là <em>Sương Ranh</em>, bởi vì mỗi buổi sáng, mây trắng bao phủ từ lưng núi xuống như tấm lụa ai đó vô tình để quên.</p><p>Hạ Đồng Đồng lớn lên ở đó. Mười sáu tuổi, nàng đã biết rằng ngôi làng của mình khác với mọi nơi khác: ở đây, người ta không cày ruộng hay buôn bán. Người làng Mực viết chữ.</p><p>Không phải viết lên giấy thông thường. Họ viết lên vận mệnh.</p>", "word_count": 1050},
            {"number": 2, "title": "Cây Bút Của Tổ Tiên", "content": "<p>Cây bút được cất trong hộp gỗ trầm, bọc bằng lụa đỏ thêu hoa mai.</p><p>Hạ Đồng Đồng biết về nó từ nhỏ — mỗi đêm, cha nàng thắp đèn và nhìn chằm chằm vào cái hộp đó với ánh mắt mà nàng không đặt tên được. Không phải thương nhớ. Không phải sợ hãi. Là gì đó ở giữa hai thứ đó.</p><p>— Bút của cụ cố con, cha nói khi nàng lên tám và lần đầu tiên dám hỏi. — Người viết chữ giỏi nhất trong ba đời nhà họ Hạ.</p><p>— Tại sao cha không dùng?</p><p>Cha im lặng rất lâu.</p><p>— Vì ta chưa xứng, con ạ.</p>", "word_count": 980},
        ]
    },
    {
        "slug": "trieu-thiet-son-khong-so-troi",
        "title": "Triệu Thiết Sơn Không Sợ Trời",
        "author": "Mạnh Tử Cường",
        "description": "Triệu Thiết Sơn — gã thợ rèn nghèo ở thành biên cương — không có linh căn, không có nền tảng, không có bất cứ thứ gì mà một tu sĩ cần. Nhưng hắn có đôi bàn tay cứng hơn đá và ý chí không ai bẻ gãy được.",
        "status": "completed",
        "views": 156000,
        "rating": 4.9,
        "genres": ["Kiếm Hiệp", "Tiên Hiệp"],
        "chapters": [
            {"number": 1, "title": "Gã Thợ Rèn Không Linh Căn", "content": "<p>Cái lò rèn của Triệu Thiết Sơn nằm cuối phố Đồng, cách cổng thành phía Bắc không đến hai trăm bước chân.</p><p>Không ai hỏi tại sao hắn đặt lò ở đó — gần cổng thành nghĩa là gần với những kẻ từ ngoài kéo vào, và những kẻ từ ngoài kéo vào thường cần đao kiếm được sửa, mũi tên được mài, hoặc móng ngựa được đóng lại. Đó là công việc của Triệu Thiết Sơn.</p><p>Không phải tu tiên. Không phải kết đan. Chỉ là đập búa.</p><p>Năm hai mươi tuổi, hắn đến miếu Vô Linh để thử linh căn — thứ mà mọi đứa trẻ trong thành phải làm một lần trong đời. Viên thạch thử linh không sáng lên. Không một màu nào. Lạnh và chết như đá cuội.</p><p><em>Phàm nhân.</em></p><p>Hắn đi về, đốt lò, đập búa. Sáng hôm sau, thứ duy nhất thay đổi là tảng sắt trên đe đã thành một lưỡi dao đẹp hơn hôm qua.</p>", "word_count": 1300},
        ]
    }
]

async def seed():
    async with SessionLocal() as db:
        # Admin user
        admin = User(
            username="admin",
            email="admin@novel-platform.com",
            hashed_password=hash_password("admin1234"),
            display_name="Quản Trị Viên",
            role="admin",
            bio="Người quản lý nền tảng Novel Platform.",
            is_active=True,
            is_verified=True,
        )
        reader = User(
            username="reader01",
            email="reader@example.com",
            hashed_password=hash_password("reader1234"),
            display_name="Độc Giả Ẩn Danh",
            role="reader",
            bio="Mê đọc truyện từ nhỏ. Thích huyền huyễn và kiếm hiệp.",
            is_active=True,
            is_verified=True,
        )
        db.add_all([admin, reader])
        await db.flush()

        for novel_data in NOVELS:
            genres_data = novel_data.pop("genres")
            chapters_data = novel_data.pop("chapters")

            novel = Novel(**novel_data, total_chapters=len(chapters_data))
            db.add(novel)
            await db.flush()

            for g in genres_data:
                db.add(NovelGenre(novel_id=novel.id, genre=g))

            for ch_data in chapters_data:
                db.add(Chapter(novel_id=novel.id, **ch_data))

        await db.commit()
        print(f"✅ Seed xong: {len(NOVELS)} truyện, {sum(len(n.get('chapters', [])) for n in NOVELS)} chương (trước khi pop)")

if __name__ == "__main__":
    asyncio.run(seed())
