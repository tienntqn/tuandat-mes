/**
 * Seed dữ liệu mẫu cho Tuấn Đạt MES
 * Chạy: npx ts-node prisma/seed.ts
 *
 * Cấu trúc seed:
 *   1 Company → 2 Factory → mỗi factory 3 ProductionLine
 *   5-6 Machine (phân bổ cho 2 xưởng, gán/không gán chuyền)
 *   3 Customer → 5 Style → 3 PurchaseOrder
 *   1 CompanyPlan → 2 FactoryPlan (tự động tạo StyleLine)
 *   Roles + Permissions đầy đủ theo RBAC
 *   1 User admin (username: admin / password: Admin@123)
 *   1 User tổ trưởng mẫu
 */

import {
  PrismaClient,
  EmployeePosition,
  MachineType,
  MachineStatus,
  MaintenanceType,
  POStatus,
  ProductionStage,
  PermissionAction,
  FactoryStatus,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...')

  // ──────────────────────────────────────────
  // 1. COMPANY
  // ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { taxCode: '0101234567' },
    update: {},
    create: {
      name: 'Công ty Cổ phần Tuấn Đạt',
      taxCode: '0101234567',
      phone: '0241 3825 999',
      email: 'info@tuandat.vn',
      address: 'KCN Đồng Văn, Hà Nam',
    },
  })
  console.log(`✓ Company: ${company.name}`)

  // ──────────────────────────────────────────
  // 2. FACTORY
  // ──────────────────────────────────────────
  const factory1 = await prisma.factory.upsert({
    where: { code: 'XD-A' },
    update: {},
    create: {
      companyId: company.id,
      code: 'XD-A',
      name: 'Xưởng A — Hà Nam',
      address: 'KCN Đồng Văn, Hà Nam',
      phone: '0241 3825 100',
      status: FactoryStatus.ACTIVE,
    },
  })

  const factory2 = await prisma.factory.upsert({
    where: { code: 'XD-B' },
    update: {},
    create: {
      companyId: company.id,
      code: 'XD-B',
      name: 'Xưởng B — Hưng Yên',
      address: 'KCN Phố Nối, Hưng Yên',
      phone: '0221 3890 200',
      status: FactoryStatus.ACTIVE,
    },
  })
  console.log(`✓ Factory: ${factory1.name}, ${factory2.name}`)

  // ──────────────────────────────────────────
  // 3. PRODUCTION LINES (mỗi xưởng 3 chuyền)
  // ──────────────────────────────────────────
  const linesA = await Promise.all(
    [
      { lineNumber: 1, name: 'Chuyền A1', workerCount: 35 },
      { lineNumber: 2, name: 'Chuyền A2', workerCount: 32 },
      { lineNumber: 3, name: 'Chuyền A3', workerCount: 38 },
    ].map((l) =>
      prisma.productionLine.upsert({
        where: { factoryId_lineNumber: { factoryId: factory1.id, lineNumber: l.lineNumber } },
        update: {},
        create: { factoryId: factory1.id, ...l },
      }),
    ),
  )

  const linesB = await Promise.all(
    [
      { lineNumber: 1, name: 'Chuyền B1', workerCount: 30 },
      { lineNumber: 2, name: 'Chuyền B2', workerCount: 31 },
      { lineNumber: 3, name: 'Chuyền B3', workerCount: 29 },
    ].map((l) =>
      prisma.productionLine.upsert({
        where: { factoryId_lineNumber: { factoryId: factory2.id, lineNumber: l.lineNumber } },
        update: {},
        create: { factoryId: factory2.id, ...l },
      }),
    ),
  )

  const allLines = [...linesA, ...linesB]
  console.log(`✓ ProductionLine: ${allLines.length} chuyền (3 xưởng A, 3 xưởng B)`)

  // ──────────────────────────────────────────
  // 4. EMPLOYEES
  // ──────────────────────────────────────────
  const empData = [
    // Cấp công ty
    { code: 'NV-001', fullName: 'Nguyễn Văn Admin', position: EmployeePosition.ADMIN, factoryId: null, lineId: null },
    { code: 'NV-002', fullName: 'Trần Thị Giám đốc', position: EmployeePosition.BOD, factoryId: null, lineId: null },
    { code: 'NV-003', fullName: 'Lê Văn Kế hoạch', position: EmployeePosition.COMPANY_PLANNER, factoryId: null, lineId: null },
    // Xưởng A
    { code: 'NV-101', fullName: 'Phạm Giám đốc A', position: EmployeePosition.FACTORY_DIRECTOR, factoryId: factory1.id, lineId: null },
    { code: 'NV-102', fullName: 'Hoàng Kế hoạch A', position: EmployeePosition.FACTORY_PLANNER, factoryId: factory1.id, lineId: null },
    { code: 'NV-103', fullName: 'Ngô Cơ điện A', position: EmployeePosition.MECHANIC, factoryId: factory1.id, lineId: null },
    { code: 'NV-111', fullName: 'Vũ Tổ trưởng A1', position: EmployeePosition.LINE_LEADER, factoryId: factory1.id, lineId: linesA[0].id },
    { code: 'NV-112', fullName: 'Đỗ Tổ phó A1', position: EmployeePosition.LINE_DEPUTY, factoryId: factory1.id, lineId: linesA[0].id },
    { code: 'NV-121', fullName: 'Bùi Tổ trưởng A2', position: EmployeePosition.LINE_LEADER, factoryId: factory1.id, lineId: linesA[1].id },
    { code: 'NV-131', fullName: 'Đinh Tổ trưởng A3', position: EmployeePosition.LINE_LEADER, factoryId: factory1.id, lineId: linesA[2].id },
    // Xưởng B
    { code: 'NV-201', fullName: 'Lý Giám đốc B', position: EmployeePosition.FACTORY_DIRECTOR, factoryId: factory2.id, lineId: null },
    { code: 'NV-202', fullName: 'Dương Kế hoạch B', position: EmployeePosition.FACTORY_PLANNER, factoryId: factory2.id, lineId: null },
    { code: 'NV-211', fullName: 'Cao Tổ trưởng B1', position: EmployeePosition.LINE_LEADER, factoryId: factory2.id, lineId: linesB[0].id },
  ]

  const employees = await Promise.all(
    empData.map((e) =>
      prisma.employee.upsert({
        where: { code: e.code },
        update: {},
        create: e,
      }),
    ),
  )
  console.log(`✓ Employee: ${employees.length} nhân viên`)

  // ──────────────────────────────────────────
  // 5. MACHINES (5-6 máy phân bổ 2 xưởng)
  // ──────────────────────────────────────────
  const machineData = [
    // Xưởng A — đã gán chuyền
    { code: 'MX-A001', name: 'Máy may bằng A1-01', type: MachineType.SEWING, factoryId: factory1.id, lineId: linesA[0].id, status: MachineStatus.RUNNING, brand: 'Brother', model: 'S-7300A', purchaseDate: new Date('2022-03-15') },
    { code: 'MX-A002', name: 'Máy may bằng A1-02', type: MachineType.SEWING, factoryId: factory1.id, lineId: linesA[0].id, status: MachineStatus.RUNNING, brand: 'Brother', model: 'S-7300A', purchaseDate: new Date('2022-03-15') },
    { code: 'MX-A003', name: 'Máy lập trình A2-01', type: MachineType.PROGRAMMABLE, factoryId: factory1.id, lineId: linesA[1].id, status: MachineStatus.IDLE, brand: 'Juki', model: 'AMS-221', purchaseDate: new Date('2021-08-20') },
    { code: 'MX-A004', name: 'Máy cắt A-01', type: MachineType.CUTTING, factoryId: factory1.id, lineId: null, status: MachineStatus.RUNNING, brand: 'Eastman', model: 'Eagle', purchaseDate: new Date('2020-06-01') },
    // Xưởng A — đang bảo dưỡng
    { code: 'MX-A005', name: 'Máy may bằng A3-01', type: MachineType.SEWING, factoryId: factory1.id, lineId: linesA[2].id, status: MachineStatus.MAINTENANCE, brand: 'Singer', model: 'HD110', purchaseDate: new Date('2019-11-10'), note: 'Đang bảo dưỡng định kỳ tháng 6/2026' },
    // Xưởng B
    { code: 'MX-B001', name: 'Máy may bằng B1-01', type: MachineType.SEWING, factoryId: factory2.id, lineId: linesB[0].id, status: MachineStatus.RUNNING, brand: 'Brother', model: 'S-7200C', purchaseDate: new Date('2023-01-10') },
    { code: 'MX-B002', name: 'Máy vắt sổ B1-01', type: MachineType.SEAM_SEALING, factoryId: factory2.id, lineId: linesB[0].id, status: MachineStatus.RUNNING, brand: 'Juki', model: 'MO-6716', purchaseDate: new Date('2023-01-10') },
  ]

  const machines = await Promise.all(
    machineData.map((m) =>
      prisma.machine.upsert({
        where: { code: m.code },
        update: {},
        create: m,
      }),
    ),
  )
  console.log(`✓ Machine: ${machines.length} máy`)

  // Bảo dưỡng mẫu cho máy đang MAINTENANCE
  const machineA5 = machines.find((m) => m.code === 'MX-A005')!
  await prisma.machineMaintenance.upsert({
    where: { id: 1 },
    update: {},
    create: {
      machineId: machineA5.id,
      maintenanceDate: new Date('2026-06-01'),
      type: MaintenanceType.PERIODIC,
      description: 'Bảo dưỡng định kỳ 6 tháng: vệ sinh, tra dầu, kiểm tra tải',
      performedBy: 'Ngô Cơ điện A',
      cost: 500000,
      nextDueDate: new Date('2026-12-01'),
    },
  })
  console.log(`✓ MachineMaintenance: 1 bản ghi mẫu`)

  // ──────────────────────────────────────────
  // 6. CUSTOMERS
  // ──────────────────────────────────────────
  const customers = await Promise.all(
    [
      { code: 'KH-001', name: 'Tập đoàn Uniqlo Japan', country: 'Nhật Bản', contactInfo: 'uniqlo-sourcing@uniqlo.com' },
      { code: 'KH-002', name: 'H&M Sourcing Vietnam', country: 'Thụy Điển', contactInfo: 'hm-vn@hm.com' },
      { code: 'KH-003', name: 'Nike Vietnam LLC', country: 'Mỹ', contactInfo: 'nike-vn-sourcing@nike.com' },
    ].map((c) =>
      prisma.customer.upsert({
        where: { code: c.code },
        update: {},
        create: c,
      }),
    ),
  )
  console.log(`✓ Customer: ${customers.length} khách hàng`)

  // ──────────────────────────────────────────
  // 7. STYLES
  // ──────────────────────────────────────────
  const styleData = [
    { code: 'MA-2401', name: 'Áo Polo Nam SS24', customerId: customers[0].id, season: 'SS24', sam: 12.5 },
    { code: 'MA-2402', name: 'Áo Khoác Gió Nữ FW24', customerId: customers[0].id, season: 'FW24', sam: 18.2 },
    { code: 'MB-2401', name: 'Quần Short Nam SS24', customerId: customers[1].id, season: 'SS24', sam: 9.8 },
    { code: 'MB-2402', name: 'Đầm Maxi Nữ SS24', customerId: customers[1].id, season: 'SS24', sam: 22.0 },
    { code: 'MC-2401', name: 'Áo Thể Thao Nike Dri-FIT', customerId: customers[2].id, season: 'AW24', sam: 15.5 },
  ]

  const styles = await Promise.all(
    styleData.map((s) =>
      prisma.style.upsert({
        where: { code: s.code },
        update: {},
        create: s,
      }),
    ),
  )
  console.log(`✓ Style: ${styles.length} mã hàng`)

  // ──────────────────────────────────────────
  // 8. PURCHASE ORDERS
  // ──────────────────────────────────────────
  const poData = [
    { poNumber: 'PO-2024-001', styleId: styles[0].id, totalQuantity: 10000, deliveryDate: new Date('2026-07-31'), status: POStatus.IN_PROGRESS },
    { poNumber: 'PO-2024-002', styleId: styles[2].id, totalQuantity: 8000, deliveryDate: new Date('2026-08-15'), status: POStatus.OPEN },
    { poNumber: 'PO-2024-003', styleId: styles[4].id, totalQuantity: 5000, deliveryDate: new Date('2026-09-30'), status: POStatus.OPEN },
  ]

  const pos = await Promise.all(
    poData.map((p) =>
      prisma.purchaseOrder.upsert({
        where: { poNumber: p.poNumber },
        update: {},
        create: p,
      }),
    ),
  )
  console.log(`✓ PurchaseOrder: ${pos.length} PO`)

  // ──────────────────────────────────────────
  // 9. KẾ HOẠCH 2 CẤP
  // ──────────────────────────────────────────

  // Cấp 1: Công ty phân PO-2024-001 (10.000 sp Áo Polo) cho 2 xưởng
  const companyPlanA = await prisma.companyPlan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      styleId: styles[0].id,
      poId: pos[0].id,
      factoryId: factory1.id,
      plannedQuantity: 6000,
      startDate: new Date('2026-06-01'),
      expectedFinishDate: new Date('2026-07-20'),
    },
  })

  const companyPlanB = await prisma.companyPlan.upsert({
    where: { id: 2 },
    update: {},
    create: {
      styleId: styles[0].id,
      poId: pos[0].id,
      factoryId: factory2.id,
      plannedQuantity: 4000,
      startDate: new Date('2026-06-01'),
      expectedFinishDate: new Date('2026-07-25'),
    },
  })
  console.log(`✓ CompanyPlan: 2 kế hoạch (Xưởng A: 6.000sp, Xưởng B: 4.000sp)`)

  // Cấp 2: Xưởng A phân xuống 2 chuyền (tổng ≤ 6.000)
  await prisma.factoryPlan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyPlanId: companyPlanA.id,
      lineId: linesA[0].id,
      plannedQuantity: 3200,
      expectedFinishDate: new Date('2026-07-18'),
    },
  })

  await prisma.factoryPlan.upsert({
    where: { id: 2 },
    update: {},
    create: {
      companyPlanId: companyPlanA.id,
      lineId: linesA[1].id,
      plannedQuantity: 2800,
      expectedFinishDate: new Date('2026-07-20'),
    },
  })

  // Xưởng B phân xuống 1 chuyền
  await prisma.factoryPlan.upsert({
    where: { id: 3 },
    update: {},
    create: {
      companyPlanId: companyPlanB.id,
      lineId: linesB[0].id,
      plannedQuantity: 4000,
      expectedFinishDate: new Date('2026-07-25'),
    },
  })
  console.log(`✓ FactoryPlan: 3 kế hoạch chuyền`)

  // StyleLine: tạo liên kết chuyền ↔ mã hàng (Áo Polo cho A1, A2, B1)
  await Promise.all(
    [linesA[0].id, linesA[1].id, linesB[0].id].map((lineId) =>
      prisma.styleLine.upsert({
        where: { lineId_styleId: { lineId, styleId: styles[0].id } },
        update: {},
        create: { lineId, styleId: styles[0].id },
      }),
    ),
  )
  console.log(`✓ StyleLine: Mã hàng MA-2401 gán cho 3 chuyền (A1, A2, B1)`)

  // DailyOutput mẫu cho 3 ngày gần đây
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)

  const outputSamples = [
    // Chuyền A1 — 3 ngày
    { lineId: linesA[0].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: twoDaysAgo, quantity: 380, enteredBy: 1 },
    { lineId: linesA[0].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: yesterday, quantity: 410, enteredBy: 1 },
    { lineId: linesA[0].id, styleId: styles[0].id, stage: ProductionStage.QC, outputDate: yesterday, quantity: 360, enteredBy: 1 },
    { lineId: linesA[0].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: today, quantity: 395, enteredBy: 1 },
    // Chuyền A2
    { lineId: linesA[1].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: yesterday, quantity: 340, enteredBy: 1 },
    { lineId: linesA[1].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: today, quantity: 355, enteredBy: 1 },
    // Chuyền B1
    { lineId: linesB[0].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: yesterday, quantity: 290, enteredBy: 1 },
    { lineId: linesB[0].id, styleId: styles[0].id, stage: ProductionStage.SEWING, outputDate: today, quantity: 310, enteredBy: 1 },
  ]

  for (const o of outputSamples) {
    const output = await prisma.dailyOutput.upsert({
      where: {
        lineId_styleId_stage_outputDate: {
          lineId: o.lineId,
          styleId: o.styleId,
          stage: o.stage,
          outputDate: o.outputDate,
        },
      },
      update: { quantity: o.quantity },
      create: { ...o, isLocked: o.outputDate < today },
    })
    // Ghi audit log
    await prisma.dailyOutputLog.create({
      data: {
        dailyOutputId: output.id,
        quantity: o.quantity,
        enteredBy: o.enteredBy,
        enteredAt: new Date(),
      },
    })
  }
  console.log(`✓ DailyOutput: ${outputSamples.length} bản ghi sản lượng mẫu + audit log`)

  // ──────────────────────────────────────────
  // 10. ROLES & PERMISSIONS
  // ──────────────────────────────────────────
  const resources = ['company', 'factory', 'line', 'employee', 'machine', 'maintenance', 'transfer', 'customer', 'style', 'purchase_order', 'company_plan', 'factory_plan', 'daily_output', 'report', 'user', 'role']
  const actions = Object.values(PermissionAction)

  // Tạo tất cả permissions
  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      })
    }
  }
  console.log(`✓ Permission: ${resources.length * actions.length} bản ghi`)

  // Định nghĩa các role và quyền của chúng
  type PermRule = { resource: string; actions: PermissionAction[] }

  const roleDefs: { name: string; description: string; rules: PermRule[] }[] = [
    {
      name: 'ADMIN',
      description: 'Quản trị viên hệ thống — toàn quyền',
      rules: resources.map((r) => ({ resource: r, actions })),
    },
    {
      name: 'BOD',
      description: 'Ban Giám đốc — xem toàn bộ, không chỉnh sửa master data',
      rules: resources.map((r) => ({ resource: r, actions: [PermissionAction.READ] })),
    },
    {
      name: 'COMPANY_PLANNER',
      description: 'Kế hoạch công ty — quản lý kế hoạch cấp 1',
      rules: [
        { resource: 'customer', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'style', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'purchase_order', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'company_plan', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE] },
        { resource: 'factory_plan', actions: [PermissionAction.READ] },
        { resource: 'factory', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ] },
        { resource: 'daily_output', actions: [PermissionAction.READ] },
        { resource: 'report', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'FACTORY_DIRECTOR',
      description: 'Giám đốc xưởng — quản lý toàn bộ xưởng mình',
      rules: [
        { resource: 'factory', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'machine', actions: [PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'transfer', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.APPROVE] },
        { resource: 'maintenance', actions: [PermissionAction.READ] },
        { resource: 'company_plan', actions: [PermissionAction.READ] },
        { resource: 'factory_plan', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE] },
        { resource: 'daily_output', actions: [PermissionAction.READ] },
        { resource: 'report', actions: [PermissionAction.READ] },
        { resource: 'style', actions: [PermissionAction.READ] },
        { resource: 'purchase_order', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'FACTORY_PLANNER',
      description: 'Kế hoạch xưởng — quản lý kế hoạch cấp 2',
      rules: [
        { resource: 'factory_plan', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE] },
        { resource: 'company_plan', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ] },
        { resource: 'daily_output', actions: [PermissionAction.READ] },
        { resource: 'style', actions: [PermissionAction.READ] },
        { resource: 'purchase_order', actions: [PermissionAction.READ] },
        { resource: 'report', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'LINE_LEADER',
      description: 'Tổ trưởng chuyền — nhập sản lượng chuyền mình',
      rules: [
        { resource: 'daily_output', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'factory_plan', actions: [PermissionAction.READ] },
        { resource: 'style', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'LINE_DEPUTY',
      description: 'Tổ phó chuyền — nhập sản lượng (quyền như Tổ trưởng)',
      rules: [
        { resource: 'daily_output', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'factory_plan', actions: [PermissionAction.READ] },
        { resource: 'style', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ] },
      ],
    },
    {
      name: 'MECHANIC',
      description: 'Cơ điện — quản lý máy móc xưởng mình',
      rules: [
        { resource: 'machine', actions: [PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'maintenance', actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] },
        { resource: 'transfer', actions: [PermissionAction.READ] },
        { resource: 'factory', actions: [PermissionAction.READ] },
        { resource: 'line', actions: [PermissionAction.READ] },
      ],
    },
  ]

  const roles: Record<string, { id: number }> = {}
  for (const def of roleDefs) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: { description: def.description },
      create: { name: def.name, description: def.description },
    })
    roles[def.name] = role

    // Gán permissions cho role
    for (const rule of def.rules) {
      for (const action of rule.actions) {
        const perm = await prisma.permission.findUnique({
          where: { resource_action: { resource: rule.resource, action } },
        })
        if (!perm) continue
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        })
      }
    }
  }
  console.log(`✓ Role: ${roleDefs.length} roles với permissions`)

  // ──────────────────────────────────────────
  // 11. USERS
  // ──────────────────────────────────────────
  const adminEmployee = employees.find((e) => e.code === 'NV-001')!
  const leaderEmployee = employees.find((e) => e.code === 'NV-111')!

  const adminPasswordHash = await bcrypt.hash('Admin@123', 10)
  const leaderPasswordHash = await bcrypt.hash('Leader@123', 10)

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      employeeId: adminEmployee.id,
      username: 'admin',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  })

  const leaderUser = await prisma.user.upsert({
    where: { username: 'tto_a1' },
    update: {},
    create: {
      employeeId: leaderEmployee.id,
      username: 'tto_a1',
      passwordHash: leaderPasswordHash,
      isActive: true,
    },
  })

  // Gán role cho users
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roles['ADMIN'].id } },
    update: {},
    create: { userId: adminUser.id, roleId: roles['ADMIN'].id },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: leaderUser.id, roleId: roles['LINE_LEADER'].id } },
    update: {},
    create: { userId: leaderUser.id, roleId: roles['LINE_LEADER'].id },
  })

  console.log(`✓ User: admin (Admin@123) + tto_a1/Tổ trưởng A1 (Leader@123)`)

  // ──────────────────────────────────────────
  // TỔNG KẾT
  // ──────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════╗
║           SEED HOÀN THÀNH ✓                      ║
╠══════════════════════════════════════════════════╣
║  Company    : Công ty CP Tuấn Đạt                ║
║  Factory    : 2 xưởng (A - Hà Nam, B - Hưng Yên)║
║  Line       : 6 chuyền (3+3)                     ║
║  Machine    : 7 máy                              ║
║  Customer   : 3 | Style: 5 | PO: 3              ║
║  CompanyPlan: 2 | FactoryPlan: 3                 ║
║  DailyOutput: ~8 bản ghi mẫu                     ║
║  Roles      : 8 | Permissions: 80               ║
╠══════════════════════════════════════════════════╣
║  🔑 admin       / Admin@123   (ADMIN)             ║
║  🔑 tto_a1      / Leader@123  (LINE_LEADER/A1)    ║
╚══════════════════════════════════════════════════╝
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
