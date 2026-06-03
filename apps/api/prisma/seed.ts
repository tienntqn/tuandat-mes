/**
 * Seed dữ liệu DEMO thực tế cho Tuấn Đạt MES.
 * Chạy: npx prisma db seed   (hoặc trên VPS: docker compose exec api npx prisma db seed)
 *
 * Script XÓA SẠCH dữ liệu cũ rồi tạo lại bộ demo:
 *   - 4 xưởng: Xưởng 1 (5 chuyền), Xưởng 2 (6), Xưởng 3 (8), Xưởng 4 (12) = 31 chuyền
 *   - 4 khách hàng: SOHO, GLORIA JEANS, GS, SOCO
 *   - 8 mã hàng, 4 đơn đặt hàng, 8 PO
 *   - Kế hoạch 2 cấp + sản lượng hằng ngày có đủ trạng thái: đúng hạn / trễ / vượt / hoàn thành
 *   - Kế hoạch giao hàng: đã giao đúng hạn, giao trễ, giao một phần, chờ giao, quá hạn
 *   - Roles/Permissions + user admin (admin / Admin@123)
 */

import {
  PrismaClient,
  EmployeePosition,
  MachineType,
  MachineStatus,
  MaintenanceType,
  POStatus,
  OrderStatus,
  DeliveryStatus,
  ProductionStage,
  PermissionAction,
  FactoryStatus,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ── Helpers ngày tháng (mọi mốc tính tương đối so với hôm nay để demo luôn "mới") ──
const today = new Date()
today.setHours(0, 0, 0, 0)
const d = (offsetDays: number) => {
  const x = new Date(today)
  x.setDate(today.getDate() + offsetDays)
  return x
}
const dayMs = 86_400_000
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0)

// Chia tổng `total` thành `nDays` ngày (chênh lệch nhẹ giữa các ngày)
function spread(total: number, nDays: number): number[] {
  if (total <= 0 || nDays <= 0) return []
  const base = Math.floor(total / nDays)
  const arr = Array(nDays).fill(base)
  let rem = total - base * nDays
  for (let i = nDays - 1; rem > 0; i--, rem--) arr[i % nDays]++
  return arr
}

async function wipe() {
  // Xóa theo thứ tự FK (con trước, cha sau)
  await prisma.dailyOutputLog.deleteMany()
  await prisma.dailyOutput.deleteMany()
  await prisma.deliveryPlan.deleteMany()
  await prisma.factoryPlan.deleteMany()
  await prisma.companyPlan.deleteMany()
  await prisma.styleLine.deleteMany()
  await prisma.machineMaintenance.deleteMany()
  await prisma.machineTransfer.deleteMany()
  await prisma.machine.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.order.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.user.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.style.deleteMany()
  await prisma.color.deleteMany()
  await prisma.size.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.productionLine.deleteMany()
  await prisma.factory.deleteMany()
  await prisma.company.deleteMany()
  console.log('🧹 Đã xóa sạch dữ liệu cũ')
}

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu DEMO...')
  await wipe()

  // ── 1. COMPANY ──
  const company = await prisma.company.create({
    data: {
      name: 'Công ty Cổ phần Tuấn Đạt',
      taxCode: '0101234567',
      phone: '0241 3825 999',
      email: 'info@tuandat.vn',
      address: 'KCN Đồng Văn, Hà Nam',
    },
  })

  // ── 2. FACTORIES + LINES ──
  const factoryConfigs = [
    { code: 'X1', name: 'Xưởng 1', lines: 5, base: 32 },
    { code: 'X2', name: 'Xưởng 2', lines: 6, base: 30 },
    { code: 'X3', name: 'Xưởng 3', lines: 8, base: 34 },
    { code: 'X4', name: 'Xưởng 4', lines: 12, base: 36 },
  ]
  const factories: { id: number }[] = []
  const linesByFactory: { id: number }[][] = []
  for (const fc of factoryConfigs) {
    const factory = await prisma.factory.create({
      data: {
        companyId: company.id,
        code: fc.code,
        name: fc.name,
        address: 'KCN Đồng Văn, Hà Nam',
        phone: '0241 3825 000',
        status: FactoryStatus.ACTIVE,
      },
    })
    factories.push(factory)
    const lines: { id: number }[] = []
    for (let i = 1; i <= fc.lines; i++) {
      const line = await prisma.productionLine.create({
        data: {
          factoryId: factory.id,
          lineNumber: i,
          name: `Chuyền ${i}`,
          workerCount: fc.base + ((i * 3) % 9) - 2,
          status: FactoryStatus.ACTIVE,
        },
      })
      lines.push(line)
    }
    linesByFactory.push(lines)
  }
  console.log(`✓ Factory: 4 xưởng — ${factoryConfigs.map((f) => `${f.name}(${f.lines})`).join(', ')} = 31 chuyền`)

  // ── 3. EMPLOYEES ──
  const companyEmps = [
    { code: 'NV-001', fullName: 'Nguyễn Văn Admin', position: EmployeePosition.ADMIN },
    { code: 'NV-002', fullName: 'Trần Thị Giám đốc', position: EmployeePosition.BOD },
    { code: 'NV-003', fullName: 'Lê Văn Kế hoạch', position: EmployeePosition.COMPANY_PLANNER },
  ]
  const empCreated: Record<string, { id: number }> = {}
  for (const e of companyEmps) {
    empCreated[e.code] = await prisma.employee.create({ data: { ...e, factoryId: null, lineId: null } })
  }
  // Mỗi xưởng: 1 GĐ, 1 KH, 1 cơ điện + tổ trưởng chuyền 1
  const leaderEmpByFactory: { id: number }[] = []
  for (let fi = 0; fi < factories.length; fi++) {
    const f = factories[fi]
    const n = fi + 1
    await prisma.employee.create({ data: { code: `NV-${n}01`, fullName: `Giám đốc Xưởng ${n}`, position: EmployeePosition.FACTORY_DIRECTOR, factoryId: f.id } })
    await prisma.employee.create({ data: { code: `NV-${n}02`, fullName: `Kế hoạch Xưởng ${n}`, position: EmployeePosition.FACTORY_PLANNER, factoryId: f.id } })
    await prisma.employee.create({ data: { code: `NV-${n}03`, fullName: `Cơ điện Xưởng ${n}`, position: EmployeePosition.MECHANIC, factoryId: f.id } })
    const leader = await prisma.employee.create({ data: { code: `NV-${n}11`, fullName: `Tổ trưởng X${n}-C1`, position: EmployeePosition.LINE_LEADER, factoryId: f.id, lineId: linesByFactory[fi][0].id } })
    leaderEmpByFactory.push(leader)
  }
  console.log(`✓ Employee: ${3 + factories.length * 4} nhân viên`)

  // ── 4. ROLES & PERMISSIONS ──
  const resources = ['company', 'factory', 'line', 'employee', 'machine', 'maintenance', 'transfer', 'customer', 'style', 'order', 'purchase_order', 'company_plan', 'factory_plan', 'delivery_plan', 'daily_output', 'report', 'user', 'role']
  const actions = Object.values(PermissionAction)
  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.create({ data: { resource, action } })
    }
  }
  type PermRule = { resource: string; actions: PermissionAction[] }
  const RW = [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE]
  const RWD = [...RW, PermissionAction.DELETE]
  const roleDefs: { name: string; description: string; rules: PermRule[] }[] = [
    { name: 'ADMIN', description: 'Quản trị viên — toàn quyền', rules: resources.map((r) => ({ resource: r, actions })) },
    { name: 'BOD', description: 'Ban Giám đốc — xem toàn bộ', rules: resources.map((r) => ({ resource: r, actions: [PermissionAction.READ] })) },
    {
      name: 'COMPANY_PLANNER', description: 'Kế hoạch công ty', rules: [
        { resource: 'customer', actions: RW }, { resource: 'style', actions: RW },
        { resource: 'order', actions: RW }, { resource: 'purchase_order', actions: RW },
        { resource: 'company_plan', actions: RWD }, { resource: 'delivery_plan', actions: RW },
        { resource: 'factory_plan', actions: [PermissionAction.READ] }, { resource: 'report', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'FACTORY_DIRECTOR', description: 'Giám đốc xưởng', rules: [
        { resource: 'line', actions: [PermissionAction.READ, PermissionAction.UPDATE] }, { resource: 'machine', actions: [PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'transfer', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.APPROVE] },
        { resource: 'factory_plan', actions: RWD }, { resource: 'daily_output', actions: [PermissionAction.READ] }, { resource: 'report', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'FACTORY_PLANNER', description: 'Kế hoạch xưởng', rules: [
        { resource: 'factory_plan', actions: RWD }, { resource: 'delivery_plan', actions: RWD },
        { resource: 'company_plan', actions: [PermissionAction.READ] }, { resource: 'report', actions: [PermissionAction.READ] },
      ],
    },
    { name: 'LINE_LEADER', description: 'Tổ trưởng', rules: [{ resource: 'daily_output', actions: RW }, { resource: 'factory_plan', actions: [PermissionAction.READ] }] },
    { name: 'LINE_DEPUTY', description: 'Tổ phó', rules: [{ resource: 'daily_output', actions: RW }, { resource: 'factory_plan', actions: [PermissionAction.READ] }] },
    { name: 'MECHANIC', description: 'Cơ điện', rules: [{ resource: 'machine', actions: [PermissionAction.READ, PermissionAction.UPDATE] }, { resource: 'maintenance', actions: RW }] },
  ]
  const roles: Record<string, { id: number }> = {}
  for (const def of roleDefs) {
    const role = await prisma.role.create({ data: { name: def.name, description: def.description } })
    roles[def.name] = role
    for (const rule of def.rules) {
      for (const action of rule.actions) {
        const perm = await prisma.permission.findUnique({ where: { resource_action: { resource: rule.resource, action } } })
        if (perm) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } })
      }
    }
  }
  console.log(`✓ Role: ${roleDefs.length} | Permission: ${resources.length * actions.length}`)

  // ── 5. USERS ──
  const adminHash = await bcrypt.hash('Admin@123', 10)
  const leaderHash = await bcrypt.hash('Leader@123', 10)
  const adminUser = await prisma.user.create({ data: { employeeId: empCreated['NV-001'].id, username: 'admin', passwordHash: adminHash, isActive: true } })
  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: roles['ADMIN'].id } })
  const leaderUser = await prisma.user.create({ data: { employeeId: leaderEmpByFactory[0].id, username: 'tto_x1', passwordHash: leaderHash, isActive: true } })
  await prisma.userRole.create({ data: { userId: leaderUser.id, roleId: roles['LINE_LEADER'].id } })
  const enteredBy = adminUser.id

  // ── 6. CUSTOMERS ──
  const customerData = [
    { code: 'KH-SOHO', name: 'SOHO', country: 'Mỹ', contactInfo: 'sourcing@soho.com' },
    { code: 'KH-GJ', name: 'GLORIA JEANS', country: 'Nga', contactInfo: 'order@gloria-jeans.com' },
    { code: 'KH-GS', name: 'GS', country: 'Hàn Quốc', contactInfo: 'buy@gs.co.kr' },
    { code: 'KH-SOCO', name: 'SOCO', country: 'Indonesia', contactInfo: 'po@soco.id' },
  ]
  const customers: { id: number }[] = []
  for (const c of customerData) customers.push(await prisma.customer.create({ data: c }))

  // ── 7. STYLES ──
  const styleData = [
    { code: 'SH-2601', name: 'Áo Polo Nam SS26', customerIdx: 0, sam: 12.5, season: 'SS26' },
    { code: 'SH-2602', name: 'Áo Thun Cổ Tròn SS26', customerIdx: 0, sam: 8.5, season: 'SS26' },
    { code: 'GJ-2601', name: 'Quần Jeans Nam FW26', customerIdx: 1, sam: 24.0, season: 'FW26' },
    { code: 'GJ-2602', name: 'Áo Khoác Jeans Nữ FW26', customerIdx: 1, sam: 28.5, season: 'FW26' },
    { code: 'GS-2601', name: 'Áo Hoodie Nỉ AW26', customerIdx: 2, sam: 19.0, season: 'AW26' },
    { code: 'GS-2602', name: 'Quần Short Kaki SS26', customerIdx: 2, sam: 10.5, season: 'SS26' },
    { code: 'SC-2601', name: 'Đầm Maxi Nữ SS26', customerIdx: 3, sam: 22.0, season: 'SS26' },
    { code: 'SC-2602', name: 'Áo Sơ Mi Nữ SS26', customerIdx: 3, sam: 14.0, season: 'SS26' },
  ]
  const styles: { id: number }[] = []
  for (const s of styleData) {
    styles.push(await prisma.style.create({ data: { code: s.code, name: s.name, customerId: customers[s.customerIdx].id, sam: s.sam, season: s.season } }))
  }
  console.log(`✓ Customer: 4 (SOHO, GLORIA JEANS, GS, SOCO) | Style: ${styles.length}`)

  // ── 7b. MÀU & SIZE (catalog dùng chung) ──
  await prisma.color.createMany({
    data: [
      { code: 'WHT', name: 'Trắng', hex: '#FFFFFF' },
      { code: 'BLK', name: 'Đen', hex: '#000000' },
      { code: 'NVY', name: 'Navy', hex: '#1F2A56' },
      { code: 'RED', name: 'Đỏ', hex: '#D32F2F' },
      { code: 'GRY', name: 'Xám', hex: '#9E9E9E' },
      { code: 'BLU', name: 'Xanh dương', hex: '#1976D2' },
      { code: 'GRN', name: 'Xanh lá', hex: '#388E3C' },
      { code: 'BEI', name: 'Be', hex: '#D8C3A5' },
    ],
  })
  await prisma.size.createMany({
    data: [
      { code: 'S', name: 'S', sortOrder: 1 },
      { code: 'M', name: 'M', sortOrder: 2 },
      { code: 'L', name: 'L', sortOrder: 3 },
      { code: 'XL', name: 'XL', sortOrder: 4 },
      { code: '2XL', name: '2XL', sortOrder: 5 },
      { code: '3XL', name: '3XL', sortOrder: 6 },
    ],
  })
  console.log(`✓ Color: 8 | Size: 6`)

  // ── 8. ORDERS (đơn đặt hàng) ──
  const orderData = [
    { number: 'ĐH-2026-001', customerIdx: 0, orderOff: -45, deliveryOff: 30, status: OrderStatus.IN_PROGRESS, note: 'Đơn hè SOHO' },
    { number: 'ĐH-2026-002', customerIdx: 1, orderOff: -40, deliveryOff: 45, status: OrderStatus.IN_PROGRESS, note: 'Đơn thu đông Gloria' },
    { number: 'ĐH-2026-003', customerIdx: 2, orderOff: -35, deliveryOff: 35, status: OrderStatus.IN_PROGRESS, note: '' },
    { number: 'ĐH-2026-004', customerIdx: 3, orderOff: -30, deliveryOff: 50, status: OrderStatus.OPEN, note: '' },
  ]
  const orders: { id: number }[] = []
  for (const o of orderData) {
    orders.push(await prisma.order.create({ data: { orderNumber: o.number, customerId: customers[o.customerIdx].id, orderDate: d(o.orderOff), deliveryDate: d(o.deliveryOff), status: o.status, note: o.note || null } }))
  }

  // ── 9. PURCHASE ORDERS ──
  const poData = [
    { number: 'PO-2026-001', styleIdx: 0, orderIdx: 0, qty: 12000, deliveryOff: 27, status: POStatus.IN_PROGRESS },
    { number: 'PO-2026-002', styleIdx: 1, orderIdx: 0, qty: 8000, deliveryOff: 20, status: POStatus.IN_PROGRESS },
    { number: 'PO-2026-003', styleIdx: 2, orderIdx: 1, qty: 15000, deliveryOff: 45, status: POStatus.IN_PROGRESS },
    { number: 'PO-2026-004', styleIdx: 3, orderIdx: 1, qty: 6000, deliveryOff: 12, status: POStatus.IN_PROGRESS },
    { number: 'PO-2026-005', styleIdx: 4, orderIdx: 2, qty: 10000, deliveryOff: 35, status: POStatus.OPEN },
    { number: 'PO-2026-006', styleIdx: 5, orderIdx: 2, qty: 9000, deliveryOff: 6, status: POStatus.IN_PROGRESS },
    { number: 'PO-2026-007', styleIdx: 6, orderIdx: 3, qty: 7000, deliveryOff: 50, status: POStatus.OPEN },
    { number: 'PO-2026-008', styleIdx: 7, orderIdx: 3, qty: 11000, deliveryOff: -6, status: POStatus.COMPLETED },
  ]
  const pos: { id: number }[] = []
  for (const p of poData) {
    pos.push(await prisma.purchaseOrder.create({ data: { poNumber: p.number, styleId: styles[p.styleIdx].id, orderId: orders[p.orderIdx].id, totalQuantity: p.qty, deliveryDate: d(p.deliveryOff), status: p.status } }))
  }
  console.log(`✓ Order: ${orders.length} | PO: ${pos.length}`)

  // ── 10. KẾ HOẠCH 2 CẤP + SẢN LƯỢNG ──
  // Mỗi group = 1 (PO, xưởng) → 1 CompanyPlan; mỗi dòng → 1 FactoryPlan + sản lượng.
  type Group = { poIdx: number; styleIdx: number; fIdx: number; startOff: number; finishOff: number; lines: { lineIdx: number; qty: number; progress: number }[] }
  const groups: Group[] = [
    // PO0 Polo → Xưởng 1 (đúng tiến độ / vượt)
    { poIdx: 0, styleIdx: 0, fIdx: 0, startOff: -25, finishOff: 18, lines: [{ lineIdx: 0, qty: 4500, progress: 0.62 }, { lineIdx: 1, qty: 4000, progress: 0.58 }, { lineIdx: 2, qty: 3500, progress: 0.66 }] },
    // PO1 Tshirt → Xưởng 2 (TRỄ)
    { poIdx: 1, styleIdx: 1, fIdx: 1, startOff: -22, finishOff: 10, lines: [{ lineIdx: 0, qty: 4000, progress: 0.35 }, { lineIdx: 1, qty: 4000, progress: 0.42 }] },
    // PO2 Jeans → Xưởng 3 + Xưởng 4 (đúng tiến độ, deadline xa)
    { poIdx: 2, styleIdx: 2, fIdx: 2, startOff: -20, finishOff: 40, lines: [{ lineIdx: 0, qty: 2500, progress: 0.5 }, { lineIdx: 1, qty: 2500, progress: 0.48 }, { lineIdx: 2, qty: 2500, progress: 0.46 }] },
    { poIdx: 2, styleIdx: 2, fIdx: 3, startOff: -20, finishOff: 40, lines: [{ lineIdx: 0, qty: 2500, progress: 0.52 }, { lineIdx: 1, qty: 2500, progress: 0.5 }, { lineIdx: 2, qty: 2500, progress: 0.44 }] },
    // PO3 Jacket → Xưởng 3 (TRỄ NẶNG — deadline gần)
    { poIdx: 3, styleIdx: 3, fIdx: 2, startOff: -28, finishOff: 6, lines: [{ lineIdx: 3, qty: 3000, progress: 0.4 }, { lineIdx: 4, qty: 3000, progress: 0.45 }] },
    // PO5 Short → Xưởng 4 (gần xong nhưng hơi trễ)
    { poIdx: 5, styleIdx: 5, fIdx: 3, startOff: -30, finishOff: -1, lines: [{ lineIdx: 3, qty: 3000, progress: 0.72 }, { lineIdx: 4, qty: 3000, progress: 0.74 }, { lineIdx: 5, qty: 3000, progress: 0.7 }] },
    // PO7 Blouse → Xưởng 2 (HOÀN THÀNH)
    { poIdx: 7, styleIdx: 7, fIdx: 1, startOff: -52, finishOff: -6, lines: [{ lineIdx: 2, qty: 3700, progress: 1.0 }, { lineIdx: 3, qty: 3700, progress: 1.0 }, { lineIdx: 4, qty: 3600, progress: 1.0 }] },
  ]

  const outputRows: { lineId: number; styleId: number; stage: ProductionStage; outputDate: Date; quantity: number; enteredBy: number; isLocked: boolean }[] = []
  let cpCount = 0
  let fpCount = 0
  for (const g of groups) {
    const styleId = styles[g.styleIdx].id
    const total = sum(g.lines.map((l) => l.qty))
    const companyPlan = await prisma.companyPlan.create({
      data: { styleId, poId: pos[g.poIdx].id, factoryId: factories[g.fIdx].id, plannedQuantity: total, startDate: d(g.startOff), expectedFinishDate: d(g.finishOff) },
    })
    cpCount++

    const endDay = g.finishOff < 0 ? d(g.finishOff) : today
    const startDate = d(g.startOff)
    const nDays = clamp(Math.round((endDay.getTime() - startDate.getTime()) / dayMs), 1, 9)

    for (const ln of g.lines) {
      const line = linesByFactory[g.fIdx][ln.lineIdx]
      await prisma.factoryPlan.create({ data: { companyPlanId: companyPlan.id, lineId: line.id, plannedQuantity: ln.qty, expectedFinishDate: d(g.finishOff) } })
      fpCount++
      await prisma.styleLine.create({ data: { lineId: line.id, styleId } })

      // Sản lượng tích lũy theo công đoạn: cắt > may > KCS > đóng gói
      const sewCum = Math.round(ln.progress * ln.qty)
      const stageCum: [ProductionStage, number][] = [
        [ProductionStage.CUTTING, Math.min(ln.qty, Math.round(sewCum * 1.12))],
        [ProductionStage.SEWING, sewCum],
        [ProductionStage.QC, Math.round(sewCum * 0.85)],
        [ProductionStage.PACKING, Math.round(sewCum * 0.7)],
      ]
      for (const [stage, cum] of stageCum) {
        const parts = spread(cum, nDays)
        parts.forEach((q, k) => {
          if (q <= 0) return
          const outputDate = new Date(endDay.getTime() - (nDays - 1 - k) * dayMs)
          outputRows.push({ lineId: line.id, styleId, stage, outputDate, quantity: q, enteredBy, isLocked: outputDate.getTime() < today.getTime() })
        })
      }
    }
  }
  await prisma.dailyOutput.createMany({ data: outputRows, skipDuplicates: true })
  console.log(`✓ CompanyPlan: ${cpCount} | FactoryPlan: ${fpCount} | DailyOutput: ${outputRows.length} bản ghi`)

  // Audit log mẫu: mô phỏng tổ trưởng nhập lại sản lượng SEWING hôm nay (lấy lần cuối)
  const todaySew = await prisma.dailyOutput.findFirst({ where: { stage: ProductionStage.SEWING, outputDate: today }, orderBy: { id: 'asc' } })
  if (todaySew) {
    await prisma.dailyOutputLog.createMany({
      data: [
        { dailyOutputId: todaySew.id, quantity: Math.round(todaySew.quantity * 0.6), enteredBy, enteredAt: new Date(today.getTime() + 10 * 3600_000) },
        { dailyOutputId: todaySew.id, quantity: todaySew.quantity, enteredBy, enteredAt: new Date(today.getTime() + 17 * 3600_000) },
      ],
    })
  }

  // ── 11. KẾ HOẠCH GIAO HÀNG (đủ trạng thái) ──
  const deliveries = [
    // PO7 hoàn thành — giao đúng/sớm hạn
    { poIdx: 7, plannedOff: -6, qty: 11000, actualOff: -7, actualQty: 11000, status: DeliveryStatus.DELIVERED, note: 'Giao sớm 1 ngày' },
    // PO5 — giao TRỄ 2 ngày
    { poIdx: 5, plannedOff: -3, qty: 9000, actualOff: -1, actualQty: 9000, status: DeliveryStatus.DELIVERED, note: 'Giao trễ 2 ngày' },
    // PO0 — giao MỘT PHẦN (đợt 1) + còn lại chờ giao
    { poIdx: 0, plannedOff: -1, qty: 4000, actualOff: -1, actualQty: 4000, status: DeliveryStatus.PARTIAL, note: 'Đợt 1' },
    { poIdx: 0, plannedOff: 27, qty: 8000, actualOff: null, actualQty: null, status: DeliveryStatus.PENDING, note: 'Đợt 2' },
    // PO1 — chờ giao (đúng kế hoạch)
    { poIdx: 1, plannedOff: 20, qty: 8000, actualOff: null, actualQty: null, status: DeliveryStatus.PENDING, note: '' },
    // PO2 — 2 đợt chờ giao
    { poIdx: 2, plannedOff: 25, qty: 7000, actualOff: null, actualQty: null, status: DeliveryStatus.PENDING, note: 'Đợt 1' },
    { poIdx: 2, plannedOff: 45, qty: 8000, actualOff: null, actualQty: null, status: DeliveryStatus.PENDING, note: 'Đợt 2' },
    // PO3 — QUÁ HẠN giao mà chưa giao (sản xuất trễ)
    { poIdx: 3, plannedOff: -2, qty: 6000, actualOff: null, actualQty: null, status: DeliveryStatus.PENDING, note: 'Quá hạn — chờ xử lý' },
  ]
  for (const dp of deliveries) {
    await prisma.deliveryPlan.create({
      data: { poId: pos[dp.poIdx].id, plannedDate: d(dp.plannedOff), plannedQuantity: dp.qty, actualDate: dp.actualOff != null ? d(dp.actualOff) : null, actualQuantity: dp.actualQty, status: dp.status, note: dp.note || null },
    })
  }
  console.log(`✓ DeliveryPlan: ${deliveries.length} (đã giao/giao trễ/một phần/chờ/quá hạn)`)

  // ── 12. MACHINES (mẫu, có máy hỏng & sắp bảo dưỡng để demo cảnh báo) ──
  const machineData: { code: string; name: string; type: MachineType; fIdx: number; lineIdx: number | null; status: MachineStatus; brand: string; model: string; purchaseOff: number; note?: string }[] = [
    { code: 'MX-X1-001', name: 'Máy may 1 kim X1-C1', type: MachineType.SEWING, fIdx: 0, lineIdx: 0, status: MachineStatus.RUNNING, brand: 'Juki', model: 'DDL-9000', purchaseOff: -800 },
    { code: 'MX-X1-002', name: 'Máy cắt X1', type: MachineType.CUTTING, fIdx: 0, lineIdx: null, status: MachineStatus.RUNNING, brand: 'Eastman', model: 'Eagle', purchaseOff: -1200 },
    { code: 'MX-X2-001', name: 'Máy lập trình X2-C1', type: MachineType.PROGRAMMABLE, fIdx: 1, lineIdx: 0, status: MachineStatus.BROKEN, brand: 'Brother', model: 'BAS-326', purchaseOff: -1500, note: 'Hỏng bo mạch — chờ sửa' },
    { code: 'MX-X3-001', name: 'Máy may X3-C1', type: MachineType.SEWING, fIdx: 2, lineIdx: 0, status: MachineStatus.MAINTENANCE, brand: 'Juki', model: 'DDL-8700', purchaseOff: -2000, note: 'Bảo dưỡng định kỳ' },
    { code: 'MX-X4-001', name: 'Máy vắt sổ X4-C1', type: MachineType.SEAM_SEALING, fIdx: 3, lineIdx: 0, status: MachineStatus.RUNNING, brand: 'Juki', model: 'MO-6716', purchaseOff: -600 },
    { code: 'MX-X4-002', name: 'Máy may X4-C2', type: MachineType.SEWING, fIdx: 3, lineIdx: 1, status: MachineStatus.IDLE, brand: 'Brother', model: 'S-7300A', purchaseOff: -400 },
  ]
  for (const m of machineData) {
    const machine = await prisma.machine.create({
      data: { code: m.code, name: m.name, type: m.type, factoryId: factories[m.fIdx].id, lineId: m.lineIdx != null ? linesByFactory[m.fIdx][m.lineIdx].id : null, status: m.status, brand: m.brand, model: m.model, purchaseDate: d(m.purchaseOff), note: m.note ?? null },
    })
    if (m.status === MachineStatus.MAINTENANCE) {
      await prisma.machineMaintenance.create({
        data: { machineId: machine.id, maintenanceDate: d(-2), type: MaintenanceType.PERIODIC, description: 'Vệ sinh, tra dầu, kiểm tra tải', performedBy: 'Cơ điện Xưởng 3', cost: 500000, nextDueDate: d(5) },
      })
    }
  }
  console.log(`✓ Machine: ${machineData.length} (có 1 hỏng, 1 đang bảo dưỡng sắp tới hạn)`)

  console.log(`
╔══════════════════════════════════════════════════════════╗
║                 SEED DEMO HOÀN THÀNH ✓                    ║
╠══════════════════════════════════════════════════════════╣
║  4 xưởng / 31 chuyền · 4 KH (SOHO, GLORIA, GS, SOCO)      ║
║  8 mã hàng · 4 đơn hàng · 8 PO                            ║
║  Sản xuất: đúng hạn / trễ / vượt / hoàn thành            ║
║  Giao hàng: đã giao · trễ · một phần · chờ · quá hạn     ║
╠══════════════════════════════════════════════════════════╣
║  🔑 admin   / Admin@123   (ADMIN)                         ║
║  🔑 tto_x1  / Leader@123  (Tổ trưởng Xưởng 1 - Chuyền 1)  ║
╚══════════════════════════════════════════════════════════╝
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
