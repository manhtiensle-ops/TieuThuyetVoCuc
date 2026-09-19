# KẾ HOẠCH TRIỂN KHAI: HỆ THỐNG BÌNH LUẬN ĐOẠN VĂN & THẢO LUẬN CHƯƠNG
*(Inline Paragraph Comments & Chapter Discussion System)*

---

## I. TỔNG QUAN & MỤC TIÊU DỰ ÁN
Xây dựng phân hệ tương tác cộng đồng đột phá cho nền tảng web novel:
1. **Bình luận theo từng đoạn văn (Inline Paragraph Comments)**: Độc giả có thể nhấp vào bất kỳ đoạn văn nào trong chương truyện để xem thảo luận, trích dẫn nội dung và để lại bình luận của riêng mình (phong cách Wattpad / Medium).
2. **Huy hiệu số lượng bình luận thông minh (Smart Comment Badges)**: Hiển thị icon `💬 N` thanh lịch cạnh các đoạn văn có thảo luận sôi nổi.
3. **Bình luận tổng kết cuối chương (Chapter Discussion)**: Nơi độc giả nhận xét cảm nghĩ sau khi đọc xong toàn bộ chương.
4. **Phản hồi theo luồng (Threaded Replies 1 cấp)**: Cho phép độc giả trả lời trực tiếp bình luận của người khác.
5. **Cảm xúc nhanh (Reactions)**: Thả reaction đa dạng (❤️ Thích, 😂 Hài hước, 🔥 Quá đỉnh, 🤯 Sốc).
6. **Kiểm duyệt & Quản trị CMS (Moderation & Anti-Spam)**: Rate limit chống spam (1 cmt / 10s), sanitize chống XSS, tích hợp giao diện Admin CMS để xóa bình luận vi phạm.

---

## II. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SPECIFICATION)

### 1. Nâng cấp bảng `comments`
- `id`: Integer, Primary Key, Auto Increment.
- `chapter_id`: Integer, Foreign Key trỏ tới `chapters.id` (ON DELETE CASCADE, Index).
- `user_id`: Integer, Foreign Key trỏ tới `users.id` (ON DELETE CASCADE, Index).
- `paragraph_index`: Integer, Nullable, Index.
  - `NULL`: Bình luận thảo luận chung ở chân trang chương.
  - `0, 1, 2, ...`: Thứ tự đoạn văn được trích dẫn trong chương.
- `parent_id`: Integer, Nullable, Foreign Key trỏ tới chính `comments.id` (ON DELETE CASCADE) để hỗ trợ reply 1 cấp.
- `content`: Text, Nullable=False (tối đa 1.000 ký tự, đã lọc ký tự đặc biệt).
- `likes_count`: Integer, Default = 0 (tính tổng reaction tích cực).
- `created_at`: DateTime(timezone=True), Server Default = func.now().
- `updated_at`: DateTime(timezone=True), Server Default = func.now(), On Update = func.now().

### 2. Tạo mới bảng `comment_reactions`
- `id`: Integer, Primary Key, Auto Increment.
- `comment_id`: Integer, Foreign Key trỏ tới `comments.id` (ON DELETE CASCADE, Index).
- `user_id`: Integer, Foreign Key trỏ tới `users.id` (ON DELETE CASCADE, Index).
- `reaction_type`: String(20), Nullable=False (`'like'`, `'laugh'`, `'fire'`, `'shock'`).
- `created_at`: DateTime(timezone=True), Server Default = func.now().
- **Unique Constraint**: `UNIQUE(comment_id, user_id)` (Mỗi user chỉ có 1 reaction trên 1 comment; nhấn lại cùng loại thì hủy, nhấn loại khác thì cập nhật).

---

## III. ĐẶC TẢ RESTFUL API (BACKEND FASTAPI)

### 1. Endpoints cho độc giả & cộng đồng
- **`GET /api/v1/chapters/{chapter_id}/comments/summary`**
  - **Mô tả**: Trả về thống kê số lượng comment theo từng đoạn văn trong chương.
  - **Phản hồi**:
    ```json
    {
      "chapter_id": 12,
      "total_comments": 45,
      "chapter_comments_count": 10,
      "paragraph_counts": {
        "0": 3,
        "4": 12,
        "15": 20
      }
    }
    ```
  - **Ưu điểm**: Payload cực nhẹ (<1KB), giúp ReaderView render tức thì toàn bộ huy hiệu `💬` mà không cần tải chi tiết bình luận.

- **`GET /api/v1/chapters/{chapter_id}/comments`**
  - **Query params**:
    - `paragraph_index`: integer (tùy chọn; nếu truyền thì lấy cmt của đoạn đó; nếu omit thì lấy cmt chân trang).
    - `page`: default 1, `per_page`: default 20.
  - **Phản hồi**: Danh sách comment kèm user profile (avatar, display_name, role), danh sách reply, và cờ `my_reaction` của user hiện tại.

- **`POST /api/v1/chapters/{chapter_id}/comments`** *(Yêu cầu đăng nhập)*
  - **Body**: `{ "content": string, "paragraph_index": int | null, "parent_id": int | null }`.
  - **Kiểm tra nghiệp vụ**:
    - Chặn tài khoản bị ban (`is_banned == True`).
    - Giới hạn tần suất gửi (Rate limit: tối đa 1 cmt / 10s đối với mỗi user).
    - Sanitize chuỗi nội dung văn bản tránh stored XSS.

- **`DELETE /api/v1/comments/{comment_id}`** *(Yêu cầu đăng nhập)*
  - Cho phép chủ sở hữu bình luận hoặc Admin xóa bình luận.

- **`POST /api/v1/comments/{comment_id}/react`** *(Yêu cầu đăng nhập)*
  - **Body**: `{ "reaction_type": "like" | "laugh" | "fire" | "shock" }`.
  - Nếu user đã react cùng loại trước đó -> Hủy reaction (Toggle off).
  - Nếu react loại khác -> Cập nhật sang loại mới.

### 2. Endpoints Quản Trị (Admin CMS)
- **`GET /api/v1/admin/comments`**: Tìm kiếm và quản lý toàn bộ bình luận hệ thống.
- **`DELETE /api/v1/admin/comments/{comment_id}`**: Xóa bình luận vi phạm và ghi log quản trị.

---

## IV. THIẾT KẾ GIAO DIỆN FRONTEND (UI/UX ARCHITECTURE)

### 1. Tách đoạn văn & gắn thẻ trong `ReaderView.tsx`
- Tách nội dung chương theo khối đoạn văn tiêu chuẩn (`split(/\n\s*\n/)`).
- Mỗi đoạn văn được bọc trong container tương tác:
  - Hiển thị văn bản mượt mà, hỗ trợ cả 4 chủ đề (Dark, Light, Sepia, OLED).
  - Khi đoạn văn có comment (dựa vào `summary[idx]`): Hiển thị huy hiệu `💬 N` nhỏ nhắn màu vàng kim bên phải lề đoạn văn.
  - Khi rê chuột (hover trên desktop) hoặc chạm (touch trên mobile): Hiện nút mở hộp thoại bình luận.

### 2. Thành phần `CommentDrawer.tsx` (Slide-over Drawer / Bottom Sheet)
- **Vị trí**:
  - Trên Desktop: Trượt từ cạnh phải màn hình (rộng 400px), có hiệu ứng mờ nền nhẹ, không che khuất hoàn toàn trang đọc.
  - Trên Mobile: Trượt từ dưới lên (Bottom Sheet) chiếm 75% chiều cao màn hình.
- **Cấu trúc**:
  - **Header**: Trích dẫn in nghiêng đoạn văn đang bàn luận + nút đóng `✕`.
  - **Danh sách bình luận**: Avatar, tên độc giả, thời gian (timeago), nội dung, các nút reaction (❤️, 😂, 🔥, 🤯), nút "Trả lời".
  - **Hộp soạn thảo**: Ô nhập nội dung gõ phím mượt mà, hỗ trợ phím tắt `Ctrl + Enter` để gửi ngay.

### 3. Thành phần `ChapterCommentsSection.tsx` (Thảo luận chân chương)
- Đặt ở cuối trang đọc, ngay trên nút chuyển chương Tiếp / Trước.
- Hiển thị danh sách đánh giá tổng thể của độc giả về toàn bộ chương.

---

## V. CÁC BƯỚC TRIỂN KHAI THEO LỘ TRÌNH (EXECUTION CHECKLIST)

- [x] **Bước 1: Cơ sở Dữ Liệu (Database Migration)**
  - Cập nhật model `Comment` trong `backend/app/models/comment.py` (thêm `paragraph_index`, `parent_id`, `updated_at`).
  - Tạo model `CommentReaction` trong `backend/app/models/comment.py`.
  - Viết Alembic migration và chạy `alembic upgrade head` (Đã hoàn thành revision `846592377ea1`).

- [x] **Bước 2: Backend API & Business Logic**
  - Xây dựng Pydantic Schemas trong `backend/app/schemas/comment.py`.
  - Xây dựng router `/comments` với các endpoint summary, list, create, delete, reaction.
  - Viết middleware/logic kiểm tra rate-limiting chống spam (Redis + fallback memory).
  - Viết unit test / curl test kiểm tra các kịch bản thành công và ngoại lệ (Đã kiểm thử 9/9 test cases thành công).
  - Bổ sung router quản trị `/admin/comments` phục vụ CMS.

- [x] **Bước 3: Frontend API & Store**
  - Khai báo interface `Comment`, `CommentReaction`, `CommentsSummary`, `AdminComment` trong `frontend/src/types/index.ts`.
  - Viết API client functions trong `frontend/src/api/index.ts` (`commentsApi`, cập nhật `chaptersApi` và `adminApi`).

- [x] **Bước 4: Frontend UI Components**
  - Xây dựng component `ParagraphCommentBadge.tsx`.
  - Xây dựng component `CommentDrawer.tsx` (sử dụng Tailwind + Framer Motion).
  - Xây dựng component `ChapterCommentsSection.tsx`.
  - Tích hợp vào `ReaderView.tsx` (kết nối dữ liệu realtime, trích xuất đoạn văn thông minh, đồng bộ 4 themes).

- [x] **Bước 5: Tích Hợp Admin CMS & Kiểm Thử Toàn Diện**
  - Bổ sung tab quản lý bình luận trên `AdminPage.tsx`.
  - Tìm kiếm nội dung, lọc theo người dùng, truyện, chương và xóa bình luận vi phạm.
  - Kiểm thử trải nghiệm thực tế trên cả 4 giao diện (Sáng, Tối, Sepia, OLED), màn hình desktop và điện thoại mobile.
  - Toàn bộ 5 bước đã hoàn thành xuất sắc và vượt qua các bài kiểm thử thực tế.
