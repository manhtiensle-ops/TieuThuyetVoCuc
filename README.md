# Novel Platform — Web Read & Publishing System

Hệ thống nền tảng đọc và xuất bản truyện chữ Web & Mobile hiệu năng cao, tích hợp Reader PWA, Author Dashboard, VIP Subscriptions và hạ tầng Backend FastAPI + Redis + PostgreSQL.

---

## 🌟 Tính Năng Nổi Bật (Features)

### 📖 Reader Platform (Frontend)
- **Tối Ưu Trải Nghiệm Đọc**: Hỗ trợ chế độ Sáng (Light), Tối (Dark), Vàng (Sepia); tùy chỉnh font chữ, kích thước, khoảng cách dòng.
- **Đồng Bộ Tiến Độ Đọc (Progress Sync)**: Tự động lưu và phục hồi vị trí chương + phần trăm cuộn trang (scroll progress) trên mọi thiết bị.
- **Offline Reading (PWA)**: Service Worker hỗ trợ lưu trữ offline nội dung các chương đã đọc.
- **Chapter Prefetching**: Tự động tải trước chương kế tiếp giúp chuyển chương tức thì không giật lag.

### ⚡ Hạ Tầng & Tối Ưu Hiệu Năng (Backend & Cache)
- **FastAPI + AsyncPG**: Kiến trúc bất đồng bộ (Async I/O) tối ưu truy vấn Read-heavy.
- **Redis Multi-layer Cache**: Caching nội dung chương (Chapter Content Cache) và token blacklist phản hồi cực nhanh.
- **GZip Middleware & WebP Conversion**: Tự động nén payload HTTP và chuyển đổi ảnh bìa sang WebP + LQIP (Low-Quality Image Placeholder).

### 🛡️ Bảo Mật & Phân Quyền (Security & RBAC)
- **Xác Thực JWT & Token Blacklist**: Refresh Token, Access Token với blacklist Redis chống phát tán token hỏng.
- **Role-Based Access Control (RBAC)**: Phân quyền chặt chẽ theo vai trò (`admin`, `editor`, `author`, `vip`, `reader`).
- **Chống Lỗ Hổng OWASP**: 
  - Tự động phòng chống IDOR (Author Dashboard & Chapter management).
  - Trích xuất Client IP thực tế từ Request Header (chống IP Spoofing).
  - Webhook Rate Limiting & HMAC Signature Verification.
  - IP Banning & Brute-force Limiter.

### 💼 Author Dashboard & VIP Flow
- **Author Dashboard**: Báo cáo tổng quan lượt đọc, thống kê doanh thu/lượt xem theo ngày và tỷ lệ rơi rớt độc giả (Drop-off rate).
- **Quản Lý Chương**: Cho phép Tác giả/Editor chỉnh sửa hoặc xóa chương của mình (tự động cập nhật `total_chapters` và xóa Redis cache).
- **VIP Subscription (VNPay)**: Luồng thanh toán nâng cấp VIP tích hợp VNPay Sandbox & Webhook bảo mật.

---

## 🏗️ Kiến Trúc Hệ Thống (System Architecture)

```
                       ┌─────────────────────────┐
                       │  Client (Browser / PWA) │
                       └────────────┬────────────┘
                                    │ HTTP / REST API
                                    ▼
                       ┌─────────────────────────┐
                       │   FastAPI Web Server    │
                       └─────┬─────────────┬─────┘
                             │             │
              ┌──────────────┴─┐         ┌─┴──────────────┐
              │  Redis Cache   │         │ PostgreSQL DB  │
              │  (Hot Chapters │         │  (AsyncPG ORM) │
              │   & Blacklist) │         └────────────────┘
              └────────────────┘
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)

### 1. Yêu Cầu Tiền Đề (Prerequisites)
- Python >= 3.11
- Node.js >= 18 & npm
- PostgreSQL
- Redis Server

### 2. Cấu Hình Backend

```bash
cd backend

# 1. Tạo venv và cài đặt dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # hoặc dùng uv

# 2. Tạo file cấu hình môi trường .env
cp .env.example .env
# Chỉnh sửa DATABASE_URL, REDIS_URL, SECRET_KEY trong .env

# 3. Chạy Database Migrations (Alembic)
alembic upgrade head

# 4. Chạy Backend Dev Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Cấu Hình Frontend

```bash
cd frontend

# 1. Cài đặt npm packages
npm install

# 2. Chạy Vite Dev Server
npm run dev
```

### 4. Đồng Bộ Symlink Nội Dung Truyện (Data Symlink Tool)

Hệ thống hỗ trợ script quản lý Symlink an toàn (chống Path Traversal) để kết nối dữ liệu truyện từ công cụ sáng tác sang nền tảng:

```bash
cd backend
.venv/bin/python3 scripts/create_novel_symlinks.py
```

---

## 🧪 Kiểm Thử & Quality Assurance (Testing)

Khởi chạy hệ thống kiểm thử tự động cho toàn bộ các endpoint bảo mật và tính năng:

```bash
cd backend
.venv/bin/python3 /tmp/sec_regression.py
```

---

## 📄 Giấy Phép (License)

Dự án thuộc bản quyền tác giả. Mọi quyền được bảo lưu.
