# Tuấn Đạt MES — Manufacturing Execution System

Hệ thống quản lý sản xuất PWA cho **Công ty Cổ phần Tuấn Đạt** — ngành may mặc.

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                      Nginx (port 80/443)                │
│        ┌──────────────────┬──────────────────┐          │
│        │  /api/*  →  API  │  /*  →  Frontend │          │
│        └──────────────────┴──────────────────┘          │
└─────────────────────────────────────────────────────────┘
         ↓                            ↓
┌─────────────────┐         ┌──────────────────┐
│  NestJS API     │         │  React PWA       │
│  (port 3000)    │         │  (Vite + nginx)  │
│  Prisma ORM     │         │  TailwindCSS     │
│  JWT + RBAC     │         │  shadcn/ui       │
└────────┬────────┘         └──────────────────┘
         ↓
┌─────────────────┐
│  PostgreSQL 16  │
│  (port 5432)    │
└─────────────────┘
```

**Tech stack:** React + TypeScript + Vite | NestJS + Prisma | PostgreSQL | Docker Compose | PWA (vite-plugin-pwa)

---

## Tính năng đã hoàn thành (8 giai đoạn)

| Giai đoạn | Mô tả | Trạng thái |
|-----------|-------|-----------|
| 0 | Kiến trúc + Docker + PWA shell | ✅ |
| 1 | Database schema (Prisma) + seed dữ liệu mẫu | ✅ |
| 2 | Auth JWT (access 15p + refresh 7d) + RBAC + Data Scope | ✅ |
| 3 | Master data: Company, Factory, Line, Employee, Customer, Style, PO | ✅ |
| 4 | Máy móc + Bảo dưỡng + Điều chuyển 2 bước xác nhận | ✅ |
| 5 | Kế hoạch 2 cấp: CompanyPlan → FactoryPlan | ✅ |
| 6 | Nhập sản lượng (upsert + cutoff + offline IndexedDB + auto-sync) | ✅ |
| 7 | Báo cáo tiến độ + Dashboard BGĐ + cảnh báo realtime | ✅ |
| 8 | PWA hoàn chỉnh + Error Boundary + Tests + Deploy | ✅ |

### Chi tiết tính năng

- **Auth & RBAC**: JWT access/refresh, 8 vai trò (BOD, Admin, COMPANY_PLANNER, FACTORY_DIRECTOR, FACTORY_PLANNER, LINE_LEADER, LINE_DEPUTY, MECHANIC), data scope tự động lọc theo đơn vị
- **Master data**: CRUD đầy đủ 7 module, soft delete, search/filter/pagination
- **Máy móc**: Quản lý máy theo xưởng/chuyền, lịch sử bảo dưỡng, workflow điều chuyển 2 bước (PENDING → SENDER_CONFIRMED → COMPLETED)
- **Kế hoạch 2 cấp**: Công ty phân chỉ tiêu cho xưởng, xưởng phân cho chuyền; validate tổng phân bổ ≤ SL PO/chỉ tiêu công ty
- **Sản lượng**: Nhập theo chuyền/mã hàng/công đoạn, upsert (lấy lần cuối), audit log đầy đủ, cutoff 19:00, offline mode (IndexedDB + background sync)
- **Báo cáo**: Tiến độ theo mã hàng/xưởng, biểu đồ sản lượng 7 ngày, cảnh báo (máy hỏng/bảo dưỡng, tiến độ chậm)
- **Dashboard BGĐ**: KPI tổng quan, top chuyền, cảnh báo hệ thống
- **PWA**: Installable trên Android/iOS, service worker cache, push notification, offline nhập sản lượng

---

## Cách chạy

### Yêu cầu
- Docker & Docker Compose v2
- Node.js 20+ (cho dev local)

### 1. Cài đặt nhanh (Docker — khuyến nghị)

```bash
# 1. Copy file env
cp .env.example .env

# 2. Chỉnh sửa .env (đổi mật khẩu và secret keys)
# JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải >= 32 ký tự

# 3. Build và chạy toàn bộ stack
docker compose up --build -d

# 4. Chạy migration + seed dữ liệu mẫu (chỉ cần 1 lần)
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed

# 5. Mở browser
open http://localhost
```

### 2. Dev local

```bash
# Terminal 1: PostgreSQL
docker compose up -d postgres

# Terminal 2: Backend
cd apps/api
cp ../../.env.example .env   # chỉnh DATABASE_URL trỏ localhost
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev            # http://localhost:3000

# Terminal 3: Frontend
cd apps/web
npm install
npm run dev                  # http://localhost:5173
```

### 3. Production (VPS/server)

```bash
# Trên server
git clone <repo> tuandat-mes
cd tuandat-mes
cp .env.example .env
# Chỉnh: mật khẩu DB, JWT secrets, CORS_ORIGIN=https://yourdomain.com
# Đặt SSL cert vào nginx/ssl/ rồi uncomment HTTPS block trong nginx/nginx.conf

docker compose up --build -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

---

## Tài khoản demo (sau khi seed)

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| Admin | `admin` | `Admin@123` | Toàn quyền |
| Giám đốc (BOD) | `bod` | `Admin@123` | Xem tất cả, dashboard |
| KH Công ty | `planner` | `Admin@123` | Tạo kế hoạch cấp 1 |
| GĐ Xưởng 1 | `factory1` | `Admin@123` | Quản lý xưởng 1 |
| KH Xưởng 1 | `fplanner1` | `Admin@123` | Kế hoạch cấp 2 xưởng 1 |
| Tổ trưởng C1 | `leader1` | `Admin@123` | Nhập sản lượng chuyền 1 |
| Cơ điện | `mechanic1` | `Admin@123` | Quản lý máy xưởng 1 |

---

## Cấu trúc thư mục

```
tuandat-mes/
├── apps/
│   ├── web/                    # React PWA (Vite + TypeScript)
│   │   └── src/
│   │       ├── features/       # auth, factory, machine, plan, output, dashboard, report
│   │       ├── components/     # layout, shared, ui (shadcn)
│   │       ├── hooks/          # useInstallPrompt, usePushNotification
│   │       ├── stores/         # Zustand (auth, offline)
│   │       └── lib/            # axios, utils
│   └── api/                    # NestJS + Prisma
│       └── src/
│           ├── modules/        # auth, factory, machine, plan, output, report, users
│           ├── common/         # guards, decorators, filters (data scope)
│           └── prisma/         # schema.prisma, seed.ts
├── nginx/nginx.conf            # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## API endpoints chính

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/factories
GET    /api/v1/production-lines
GET    /api/v1/machines
POST   /api/v1/machines/:id/transfer
POST   /api/v1/transfers/:id/confirm-sender
POST   /api/v1/transfers/:id/confirm-receiver

POST   /api/v1/company-plans
POST   /api/v1/factory-plans

POST   /api/v1/outputs          (upsert sản lượng)
GET    /api/v1/outputs/today    (sản lượng hôm nay của chuyền)
GET    /api/v1/outputs/history

GET    /api/v1/reports/progress
GET    /api/v1/reports/dashboard
GET    /api/v1/reports/alerts

POST   /api/v1/notifications/subscribe   (Web Push)
```

---

## Data scope & phân quyền

```
BOD / ADMIN / COMPANY_PLANNER  →  toàn công ty
FACTORY_DIRECTOR / FACTORY_PLANNER / MECHANIC  →  chỉ xưởng mình
LINE_LEADER / LINE_DEPUTY  →  chỉ chuyền mình
```

Guard `DataScopeGuard` tự động inject scope vào request và filter mọi Prisma query — tổ trưởng chuyền A không bao giờ thấy dữ liệu chuyền B.

---

## Nghiệp vụ quan trọng

### Sản lượng hàng ngày
- **Upsert (lấy lần cuối)**: nhập nhiều lần cùng ngày → giá trị cuối cùng là hiệu lực
- **Audit log**: mọi lần nhập đều được lưu (ai nhập, lúc nào, bao nhiêu)
- **Cutoff time** (mặc định 19:00): sau giờ này khóa không cho nhập
- **Offline**: lưu vào IndexedDB khi mất mạng, tự sync khi có mạng lại

### Điều chuyển máy (2 bước)
```
Tạo lệnh → PENDING
  ↓ Bên đưa xác nhận
SENDER_CONFIRMED
  ↓ Bên nhận xác nhận → máy đổi factoryId, xóa lineId
COMPLETED
  (hoặc REJECTED ở bất kỳ bước)
```

### Kế hoạch 2 cấp
- **Cấp 1** (CompanyPlan): Công ty phân chỉ tiêu cho từng Xưởng. Ràng buộc: tổng ≤ SL PO
- **Cấp 2** (FactoryPlan): Xưởng phân chỉ tiêu cho từng Chuyền. Ràng buộc: tổng ≤ chỉ tiêu công ty giao

---

## Scripts hữu ích

```bash
# Xem logs
docker compose logs -f api
docker compose logs -f web

# Reset database
docker compose down -v && docker compose up -d postgres
docker compose exec api npx prisma migrate reset --force

# Prisma studio (xem DB trực quan)
cd apps/api && npx prisma studio

# Chạy tests
cd apps/api && npm test

# Build production check
cd apps/web && npm run build
```

---

## Môi trường biến quan trọng

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `JWT_ACCESS_SECRET` | Secret key JWT access token (≥32 chars) | _bắt buộc_ |
| `JWT_REFRESH_SECRET` | Secret key JWT refresh token (≥32 chars) | _bắt buộc_ |
| `OUTPUT_CUTOFF_TIME` | Giờ khóa nhập sản lượng (HH:mm) | `19:00` |
| `CORS_ORIGIN` | Domain frontend (cho production) | `http://localhost` |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key cho Web Push | _tùy chọn_ |

---

*Tuấn Đạt MES — Xây dựng theo mô hình monorepo, 8 giai đoạn, sẵn sàng deploy production.*
