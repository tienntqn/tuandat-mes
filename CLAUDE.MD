# DỰ ÁN: TUẤN ĐẠT MES (Manufacturing Execution System)

> File này là **bộ nhớ dự án** cho Claude Code. Đọc kỹ trước mỗi phiên làm việc.
> Mọi quyết định kỹ thuật và nghiệp vụ PHẢI tuân thủ tài liệu này.

---

## 1. TỔNG QUAN

PWA (Progressive Web App) quản lý sản xuất cho **Công ty Cổ phần Tuấn Đạt** — doanh nghiệp ngành may mặc.

Luồng nghiệp vụ cốt lõi:
**Công ty → Xưởng (nhà máy) → Chuyền may → Sản lượng hàng ngày**

Hệ thống phục vụ: Ban Giám đốc, phòng Kế hoạch công ty, Giám đốc/Kế hoạch xưởng, Tổ trưởng chuyền, Cơ điện (quản lý máy móc), Admin.

Ứng dụng phải responsive + cài đặt được trên mobile (PWA), hỗ trợ offline cơ bản và push notification.

---

## 2. TECH STACK (BẮT BUỘC — không tự ý đổi)

- **Frontend:** React + TypeScript + Vite, TailwindCSS, shadcn/ui, Recharts, vite-plugin-pwa
- **State:** TanStack Query (server state) + Zustand (client state)
- **Backend:** NestJS + Prisma ORM
- **Database:** PostgreSQL (chạy qua Docker)
- **Auth:** JWT (access 15 phút + refresh 7 ngày), RBAC có DATA SCOPE
- **Validation:** Zod (frontend) / class-validator (backend)
- **Realtime:** WebSocket hoặc SSE (cập nhật sản lượng + cảnh báo)
- **Deploy:** Docker Compose (app + postgres + nginx)

Nếu cần đơn giản hóa cho prototype có thể đề xuất, nhưng phải hỏi trước.

---

## 3. CẤU TRÚC THƯ MỤC (monorepo)

```
tuandat-mes/
├── CLAUDE.md
├── docker-compose.yml          # postgres + app + nginx
├── .env.example
├── .gitignore
├── README.md
├── apps/
│   ├── web/                    # Frontend React PWA
│   │   ├── src/
│   │   │   ├── components/     # UI components (shadcn/ui)
│   │   │   ├── features/       # theo phân hệ: auth, factory, machine, plan, output, dashboard
│   │   │   ├── lib/            # axios, utils, query client
│   │   │   ├── stores/         # zustand stores
│   │   │   ├── hooks/
│   │   │   └── routes/
│   │   ├── public/             # manifest, icons PWA
│   │   └── vite.config.ts
│   └── api/                    # Backend NestJS
│       ├── src/
│       │   ├── modules/        # theo domain: auth, users, factory, machine, plan, output, report
│       │   ├── common/         # guards, decorators, filters, interceptors
│       │   └── main.ts
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
```

---

## 4. MÔ HÌNH DỮ LIỆU (ERD)

### Quan hệ tổng quát

```
Company (1) ──< Factory (N)
Factory (1) ──< ProductionLine (N)
Factory (1) ──< Machine (N)            [Machine.factoryId BẮT BUỘC]
ProductionLine (1) ──< Machine (N)     [Machine.lineId NULLABLE]
ProductionLine (N) >──< Style (N)      [bảng nối StyleLine]

Employee.factoryId (nullable) / Employee.lineId (nullable)
   tùy theo position (xem mục 5)

Customer (1) ──< Style (N) ──< PurchaseOrder (N)

CompanyPlan: Style + PO + Factory   (công ty phân chỉ tiêu cho XƯỞNG)
FactoryPlan: CompanyPlan + Line      (xưởng phân chỉ tiêu cho CHUYỀN)

Machine (1) ──< MachineMaintenance (N)
Machine (1) ──< MachineTransfer (N)

DailyOutput: Line + Style + Stage + Date  [UNIQUE]
DailyOutput (1) ──< DailyOutputLog (N)     [audit các lần nhập]

User (N) >──< Role (N)         [bảng nối UserRole]
Role (N) >──< Permission (N)   [bảng nối RolePermission]
User (1) ── Employee (1)
```

### Chi tiết các entity

**Company** — id, name, taxCode, phone, email, address, logo, timestamps, deletedAt
(1 bản ghi duy nhất, quản lý dạng trang Setting)

**Factory** (Xưởng/Nhà máy) — id, companyId, code, name, address, phone, status(enum: ACTIVE/INACTIVE), timestamps, deletedAt

**ProductionLine** (Chuyền may) — id, factoryId, lineNumber(1,2,3...), name, capacity(năng lực/ngày), status, timestamps, deletedAt

**Employee** (Nhân viên) — id, code, fullName, phone, email, position(enum), factoryId(nullable), lineId(nullable), timestamps, deletedAt

**Machine** (Máy móc) — id, code, name, type(enum: SEWING/PROGRAMMABLE/SEAM_SEALING/CUTTING/OTHER), **factoryId (BẮT BUỘC)**, **lineId (NULLABLE)**, status(enum: RUNNING/IDLE/MAINTENANCE/BROKEN/STOPPED), brand, model, purchaseDate, note, timestamps, deletedAt

**MachineMaintenance** (Lịch sử bảo dưỡng) — id, machineId, maintenanceDate, type(PERIODIC/REPAIR), description, performedBy, cost, nextDueDate, timestamps

**MachineTransfer** (Điều chuyển máy giữa xưởng) — id, machineId, transferOrderNo, transferDate, reason, fromFactoryId, toFactoryId, senderId, senderConfirmedAt(nullable), receiverId, receiverConfirmedAt(nullable), status(enum: PENDING/SENDER_CONFIRMED/COMPLETED/REJECTED), rejectReason(nullable), timestamps

**Customer** (Khách hàng) — id, code, name, country, contactInfo, timestamps, deletedAt

**Style** (Mã hàng) — id, code, name, customerId, season, image, description, sam(thời gian chuẩn/SP), timestamps, deletedAt

**PurchaseOrder** (PO) — id, poNumber, styleId, totalQuantity, deliveryDate, status, timestamps, deletedAt

**CompanyPlan** (Kế hoạch công ty → xưởng) — id, styleId, poId, factoryId, plannedQuantity, startDate, expectedFinishDate, timestamps

**FactoryPlan** (Kế hoạch xưởng → chuyền) — id, companyPlanId, lineId, plannedQuantity, expectedFinishDate, timestamps

**ProductionStage** (enum) — CUTTING / SEWING / QC / PACKING

**DailyOutput** (Sản lượng ngày) — id, lineId, styleId, stage(ProductionStage), outputDate, quantity, enteredBy, enteredAt, isLocked, timestamps
→ **UNIQUE (lineId, styleId, stage, outputDate)**

**DailyOutputLog** (Audit nhập sản lượng) — id, dailyOutputId, quantity, enteredBy, enteredAt

**User** — id, employeeId, username, passwordHash, isActive, timestamps
**Role** — id, name, description
**Permission** — id, resource, action(enum: CREATE/READ/UPDATE/DELETE/APPROVE)
**UserRole** — userId, roleId (N-N)
**RolePermission** — roleId, permissionId (N-N)
**StyleLine** — lineId, styleId (N-N: chuyền nào đang may mã nào)

---

## 5. PHÂN QUYỀN (RBAC + DATA SCOPE)

### Position enum (Employee)
COMPANY_PLANNER, BOD, ADMIN, FACTORY_DIRECTOR, FACTORY_PLANNER, LINE_LEADER (tổ trưởng), LINE_DEPUTY (tổ phó), MECHANIC (cơ điện)

### Quy tắc gán đơn vị
- LINE_LEADER / LINE_DEPUTY → **bắt buộc gán lineId**
- FACTORY_DIRECTOR / FACTORY_PLANNER / MECHANIC → **gán factoryId**
- COMPANY_PLANNER / BOD / ADMIN → cấp công ty (không gán đơn vị con)

### DATA SCOPE (RẤT QUAN TRỌNG — guard tự động lọc query)
- **LINE_LEADER / LINE_DEPUTY**: CHỈ truy cập dữ liệu CHUYỀN mình (lineId)
- **FACTORY_DIRECTOR / FACTORY_PLANNER / MECHANIC**: CHỈ dữ liệu XƯỞNG mình (factoryId)
- **COMPANY_PLANNER / BOD / ADMIN**: toàn công ty

Scope phải được inject vào request và filter ở tầng query (Prisma). Tổ trưởng KHÔNG được thấy dữ liệu chuyền khác — đây là yêu cầu bảo mật bắt buộc.

---

## 6. QUY TẮC NGHIỆP VỤ QUAN TRỌNG (KHÔNG ĐƯỢC LÀM SAI)

### 6.1 Kế hoạch sản xuất 2 CẤP — TÁCH BIỆT
- **CompanyPlan** (cấp 1): phòng Kế hoạch CÔNG TY tạo, phân chỉ tiêu (mã hàng + SL + deadline) xuống từng XƯỞNG. 1 mã hàng có thể chia cho NHIỀU xưởng. Ràng buộc: tổng phân bổ ≤ tổng SL của PO.
- **FactoryPlan** (cấp 2): Kế hoạch XƯỞNG nhận chỉ tiêu công ty giao, phân bổ xuống các CHUYỀN. Ràng buộc: tổng phân bổ cho các chuyền ≤ chỉ tiêu công ty giao xưởng. Tự động tạo liên kết StyleLine.
- KHÔNG gộp 2 cấp này làm một. Đây là lỗi dễ mắc nhất.

### 6.2 Máy móc
- `factoryId` LUÔN bắt buộc (máy luôn thuộc 1 xưởng).
- `lineId` có thể trống — máy có thể chưa gán chuyền, hoặc gán/gỡ tự do.

### 6.3 Điều chuyển máy — WORKFLOW 2 BƯỚC XÁC NHẬN
1. Tạo lệnh chuyển (transferOrderNo, ngày, lý do, từ xưởng → đến xưởng) → status = PENDING
2. Bên ĐƯA xác nhận (senderConfirmedAt) → status = SENDER_CONFIRMED
3. Bên NHẬN xác nhận (receiverConfirmedAt) → status = COMPLETED → **lúc này máy mới đổi factoryId và gỡ lineId**
4. Có thể REJECTED ở bất kỳ bước nào (ghi rejectReason)
- Cả 2 lần xác nhận PHẢI thực hiện trên app, đúng người được giao quyền.
- Lưu lịch sử đầy đủ mọi lần điều chuyển của máy.

### 6.4 Nhập sản lượng hàng ngày (Tổ trưởng)
- UNIQUE (lineId, styleId, stage, outputDate).
- **LẤY LẦN CUỐI**: nhập nhiều lần trong ngày → UPSERT ghi đè, giá trị hiệu lực = lần cuối.
- **AUDIT**: lưu MỌI lần nhập vào DailyOutputLog (ai nhập, lúc nào, giá trị).
- **CUTOFF TIME**: cấu hình giờ khóa (mặc định 19:00). Sau giờ này KHÔNG cho nhập/sửa ngày đó (isLocked = true). Giờ cutoff là setting có thể đổi.
- Mã hàng chọn được = các Style đang gán cho chuyền đó (qua StyleLine).

### 6.5 Quan hệ chuyền – mã hàng
- ProductionLine N-N Style: 1 chuyền may nhiều mã, 1 mã cho nhiều chuyền (kể cả nhiều xưởng).

### 6.6 Công đoạn sản xuất
- Tiến độ theo dõi theo 4 công đoạn: CẮT (CUTTING) → MAY (SEWING) → KCS (QC) → ĐÓNG GÓI (PACKING).

---

## 7. QUY ƯỚC CODE

- Tên biến/hàm/file: **tiếng Anh**. Nội dung UI hiển thị: **tiếng Việt**.
- Comment **tiếng Việt** cho logic nghiệp vụ phức tạp (kế hoạch 2 cấp, upsert sản lượng, workflow điều chuyển).
- Validate đầu vào ở cả frontend (Zod) và backend (class-validator).
- Soft delete (deletedAt) cho master data; không xóa cứng.
- Hash password bằng bcrypt. KHÔNG bao giờ log password/token.
- Mọi API trả về lỗi rõ ràng, thông báo lỗi tiếng Việt cho người dùng.
- UI: luôn có loading state, empty state, error boundary.
- i18n: chuẩn bị sẵn cấu trúc VI/EN (khách hàng quốc tế).

---

## 8. CHỨC NĂNG BỔ SUNG (đề xuất triển khai theo thứ tự ưu tiên)

1. Tính hiệu suất chuyền (Line Efficiency) dựa trên SAM và sản lượng thực.
2. Cảnh báo: tiến độ chậm (actual < plan theo timeline), máy đến hạn bảo dưỡng, máy hỏng.
3. Audit log toàn hệ thống (ai làm gì, khi nào).
4. Notification center + push (PWA).
5. Export báo cáo Excel / PDF.
6. Offline mode (IndexedDB) cho nhập sản lượng, tự sync khi có mạng.
7. Lịch sử thay đổi kế hoạch (version/audit).
8. Trang Settings (cutoff time, ngưỡng cảnh báo).

---

## 9. LỆNH HAY DÙNG

```bash
# Khởi động database
docker compose up -d postgres

# Backend (apps/api)
npm run start:dev          # chạy NestJS dev
npx prisma migrate dev     # tạo & chạy migration
npx prisma db seed         # seed dữ liệu mẫu
npx prisma studio          # xem DB trực quan

# Frontend (apps/web)
npm run dev                # chạy Vite dev server
npm run build              # build production

# Full stack qua docker
docker compose up --build
```

---

## 10. DỮ LIỆU SEED MẪU (để demo ngay)

1 Company (Tuấn Đạt), 2 Factory, mỗi Factory 3 ProductionLine, 5-6 Machine,
3 Customer, 5 Style, vài PO, 1 CompanyPlan + FactoryPlan mẫu,
các Role + Permission cơ bản, 1 user admin (username: admin).

---

## 11. THỨ TỰ TRIỂN KHAI (8 giai đoạn)

0. Kiến trúc + ERD + scaffold + docker + PWA shell
1. Database schema (Prisma) + seed
2. Auth + RBAC + data scope
3. Master data (CRUD: company, factory, line, employee, customer, style, PO)
4. Máy móc + bảo dưỡng + điều chuyển 2 bước
5. Kế hoạch 2 cấp (CompanyPlan + FactoryPlan)  ← cẩn thận
6. Nhập sản lượng (upsert lần cuối + cutoff + offline)  ← cẩn thận
7. Báo cáo tiến độ + Dashboard BGĐ + hoàn thiện
8. PWA hoàn chỉnh + testing + deploy

**Sau mỗi giai đoạn: commit git. Với giai đoạn 5 & 6: lập kế hoạch (Plan Mode) trước khi code.**
