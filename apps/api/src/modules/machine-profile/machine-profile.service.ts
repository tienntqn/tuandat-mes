import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService, SETTING_KEYS } from '../settings/settings.service'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

/** Một sự kiện trong lý lịch máy. */
export interface TimelineEvent {
  type:
    | 'HANDOVER' | 'BREAKDOWN' | 'INCIDENT' | 'WORK_ORDER'
    | 'MAINTENANCE_REQUEST' | 'TRANSFER' | 'STATUS' | 'CERTIFICATE' | 'LIQUIDATION'
  date: string
  title: string
  description?: string | null
  documentNo?: string | null
  status?: string | null
  refId: number
}

/**
 * Lý lịch máy móc thiết bị: gộp toàn bộ sự kiện của một máy theo thời gian,
 * thống kê hoạt động và tổng hợp cảnh báo cho bộ phận cơ điện.
 */
@Injectable()
export class MachineProfileService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /** Toàn bộ sự kiện của một máy, sắp xếp mới nhất trước. */
  async timeline(user: RequestUser, machineId: number): Promise<TimelineEvent[]> {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, deletedAt: null },
      select: { id: true, factoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    const [handovers, breakdowns, incidents, workOrders, requests, transfers, statusLogs, certificates, liquidation] =
      await Promise.all([
        this.prisma.machineHandover.findMany({ where: { machineId }, orderBy: { handoverDate: 'desc' } }),
        this.prisma.breakdownReport.findMany({ where: { machineId }, orderBy: { reportedAt: 'desc' } }),
        this.prisma.incidentReport.findMany({ where: { machineId }, orderBy: { incidentDate: 'desc' } }),
        this.prisma.workOrder.findMany({ where: { machineId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.maintenanceRequest.findMany({ where: { machineId }, orderBy: { requestedAt: 'desc' } }),
        this.prisma.machineTransfer.findMany({
          where: { machineId },
          orderBy: { transferDate: 'desc' },
          include: {
            fromFactory: { select: { name: true } },
            toFactory: { select: { name: true } },
          },
        }),
        this.prisma.machineStatusLog.findMany({ where: { machineId }, orderBy: { changedAt: 'desc' }, take: 100 }),
        this.prisma.machineCertificate.findMany({ where: { machineId, deletedAt: null } }),
        this.prisma.machineLiquidation.findFirst({ where: { machineId } }),
      ])

    const typeLabel: Record<string, string> = {
      RECEIVE: 'Bàn giao nhận máy',
      AFTER_REPAIR: 'Bàn giao sau sửa chữa',
      AFTER_MAINTENANCE: 'Bàn giao sau bảo dưỡng',
    }

    const events: TimelineEvent[] = [
      ...handovers.map((h) => ({
        type: 'HANDOVER' as const,
        date: h.handoverDate.toISOString(),
        title: typeLabel[h.type] ?? 'Bàn giao máy',
        description: h.condition,
        documentNo: h.handoverNo,
        status: h.status,
        refId: h.id,
      })),
      ...breakdowns.map((b) => ({
        type: 'BREAKDOWN' as const,
        date: b.reportedAt.toISOString(),
        title: 'Báo hỏng máy',
        description: b.symptom,
        documentNo: b.reportNo,
        status: b.status,
        refId: b.id,
      })),
      ...incidents.map((c) => ({
        type: 'INCIDENT' as const,
        date: c.incidentDate.toISOString(),
        title: 'Biên bản sự cố',
        description: c.description,
        documentNo: c.incidentNo,
        refId: c.id,
      })),
      ...workOrders.map((o) => ({
        type: 'WORK_ORDER' as const,
        date: (o.finishedAt ?? o.startedAt ?? o.createdAt).toISOString(),
        title: o.type === 'REPAIR' ? 'Phiếu sửa chữa' : 'Phiếu bảo dưỡng',
        description: o.result ?? o.content,
        documentNo: o.orderNo,
        status: o.status,
        refId: o.id,
      })),
      ...requests.map((r) => ({
        type: 'MAINTENANCE_REQUEST' as const,
        date: r.requestedAt.toISOString(),
        title: 'Yêu cầu bảo dưỡng',
        description: r.reason,
        documentNo: r.requestNo,
        status: r.status,
        refId: r.id,
      })),
      ...transfers.map((t) => ({
        type: 'TRANSFER' as const,
        date: t.transferDate.toISOString(),
        title: `Điều chuyển: ${t.fromFactory.name} → ${t.toFactory.name}`,
        description: t.reason,
        documentNo: t.transferOrderNo,
        status: t.status,
        refId: t.id,
      })),
      ...statusLogs.map((s) => ({
        type: 'STATUS' as const,
        date: s.changedAt.toISOString(),
        title: `Đổi trạng thái: ${s.fromStatus ?? '—'} → ${s.toStatus}`,
        description: s.reason,
        refId: s.id,
      })),
      ...certificates
        .filter((c) => c.issueDate)
        .map((c) => ({
          type: 'CERTIFICATE' as const,
          date: c.issueDate!.toISOString(),
          title: `Chứng chỉ: ${c.name}`,
          description: c.expiryDate ? `Hết hạn ${c.expiryDate.toLocaleDateString('vi-VN')}` : null,
          documentNo: c.certNo,
          refId: c.id,
        })),
    ]

    if (liquidation) {
      events.push({
        type: 'LIQUIDATION',
        date: liquidation.liquidationDate.toISOString(),
        title: 'Thanh lý máy',
        description: liquidation.reason,
        documentNo: liquidation.decisionNo,
        refId: liquidation.id,
      })
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Thống kê hoạt động máy móc trong khoảng thời gian: số lần hỏng, số giờ dừng,
   * chi phí sửa chữa và bảo dưỡng — dùng cho báo cáo và so sánh giữa các máy.
   */
  async statistics(user: RequestUser, fromDate?: string, toDate?: string, factoryId?: number) {
    const machineWhere: any = { deletedAt: null }
    if (user.dataScope.type === 'FACTORY') {
      machineWhere.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { summary: null, rows: [] }
    } else if (factoryId) {
      machineWhere.factoryId = factoryId
    }

    const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1)
    const to = toDate ? new Date(toDate) : new Date()

    const machines = await this.prisma.machine.findMany({
      where: machineWhere,
      select: {
        id: true, code: true, name: true, status: true,
        factory: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { code: 'asc' },
    })
    const machineIds = machines.map((m) => m.id)

    const [breakdowns, workOrders] = await Promise.all([
      this.prisma.breakdownReport.findMany({
        where: { machineId: { in: machineIds }, reportedAt: { gte: from, lte: to } },
        select: { machineId: true, stoppedProduction: true },
      }),
      this.prisma.workOrder.findMany({
        where: {
          machineId: { in: machineIds },
          status: { in: ['DONE', 'HANDED_OVER'] },
          finishedAt: { gte: from, lte: to },
        },
        select: { machineId: true, type: true, downtimeHours: true, totalCost: true },
      }),
    ])

    const rows = machines.map((m) => {
      const mBreakdowns = breakdowns.filter((b) => b.machineId === m.id)
      const mOrders = workOrders.filter((o) => o.machineId === m.id)
      const repairOrders = mOrders.filter((o) => o.type === 'REPAIR')
      const maintenanceOrders = mOrders.filter((o) => o.type === 'MAINTENANCE')

      const downtimeHours = mOrders.reduce((s, o) => s + (o.downtimeHours ? Number(o.downtimeHours) : 0), 0)
      const repairCost = repairOrders.reduce((s, o) => s + (o.totalCost ? Number(o.totalCost) : 0), 0)
      const maintenanceCost = maintenanceOrders.reduce((s, o) => s + (o.totalCost ? Number(o.totalCost) : 0), 0)

      return {
        machineId: m.id,
        machineCode: m.code,
        machineName: m.name,
        status: m.status,
        factory: m.factory,
        line: m.line,
        category: m.category,
        breakdownCount: mBreakdowns.length,
        stoppedProductionCount: mBreakdowns.filter((b) => b.stoppedProduction).length,
        repairCount: repairOrders.length,
        maintenanceCount: maintenanceOrders.length,
        downtimeHours,
        repairCost,
        maintenanceCost,
        totalCost: repairCost + maintenanceCost,
      }
    })

    const summary = {
      from: from.toISOString(),
      to: to.toISOString(),
      machineCount: machines.length,
      breakdownCount: rows.reduce((s, r) => s + r.breakdownCount, 0),
      repairCount: rows.reduce((s, r) => s + r.repairCount, 0),
      maintenanceCount: rows.reduce((s, r) => s + r.maintenanceCount, 0),
      downtimeHours: rows.reduce((s, r) => s + r.downtimeHours, 0),
      totalCost: rows.reduce((s, r) => s + r.totalCost, 0),
      // Máy hỏng nhiều nhất để ưu tiên xem xét thay thế
      topBreakdownMachines: [...rows]
        .filter((r) => r.breakdownCount > 0)
        .sort((a, b) => b.breakdownCount - a.breakdownCount)
        .slice(0, 5),
    }

    return { summary, rows }
  }

  /** Tổng hợp cảnh báo cho bộ phận cơ điện: việc cần xử lý ngay. */
  async alerts(user: RequestUser) {
    if (user.dataScope.type === 'LINE') {
      return {
        pendingBreakdowns: [], overdueMaintenance: [], expiringCertificates: [],
        lowStocks: [], pendingApprovals: [], openWorkOrders: [],
      }
    }
    const factoryFilter =
      user.dataScope.type === 'FACTORY' ? { factoryId: user.dataScope.factoryId } : {}

    const certAlertDays = await this.settings.getNumber(SETTING_KEYS.MACHINE_CERT_ALERT_DAYS, 30)
    const certLimit = new Date()
    certLimit.setDate(certLimit.getDate() + certAlertDays)
    const today = new Date()

    const [pendingBreakdowns, openWorkOrders, expiringCertificates, stocks, pendingPlans, pendingPartRequests, machines] =
      await Promise.all([
        this.prisma.breakdownReport.findMany({
          where: { ...factoryFilter, status: { in: ['REPORTED', 'ACKNOWLEDGED', 'IN_REPAIR'] } },
          orderBy: [{ severity: 'desc' }, { reportedAt: 'asc' }],
          take: 20,
          include: { machine: { select: { id: true, code: true, name: true } } },
        }),
        this.prisma.workOrder.findMany({
          where: { ...factoryFilter, status: { in: ['DRAFT', 'IN_PROGRESS', 'DONE'] } },
          orderBy: { createdAt: 'asc' },
          take: 20,
          include: { machine: { select: { id: true, code: true, name: true } } },
        }),
        this.prisma.machineCertificate.findMany({
          where: {
            deletedAt: null,
            expiryDate: { not: null, lte: certLimit },
            ...(user.dataScope.type === 'FACTORY'
              ? { machine: { factoryId: user.dataScope.factoryId } }
              : {}),
          },
          orderBy: { expiryDate: 'asc' },
          take: 20,
          include: { machine: { select: { id: true, code: true, name: true } } },
        }),
        this.prisma.sparePartStock.findMany({
          where: { ...factoryFilter, minQuantity: { gt: 0 } },
          include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } },
        }),
        this.prisma.workPlan.findMany({
          where: { ...factoryFilter, status: { in: ['PENDING_FACTORY', 'PENDING_COMPANY'] } },
          orderBy: { createdAt: 'asc' },
          take: 20,
        }),
        this.prisma.partRequest.findMany({
          where: { ...factoryFilter, status: { in: ['PENDING_FACTORY', 'PENDING_COMPANY'] } },
          orderBy: { createdAt: 'asc' },
          take: 20,
        }),
        this.prisma.machine.findMany({
          where: { deletedAt: null, liquidatedAt: null, ...factoryFilter },
          select: {
            id: true, code: true, name: true,
            line: { select: { id: true, name: true } },
            maintenances: { orderBy: { maintenanceDate: 'desc' }, take: 1, select: { nextDueDate: true } },
          },
        }),
      ])

    // Máy đã quá hạn bảo dưỡng theo mốc nextDueDate của lần bảo dưỡng gần nhất
    const overdueMaintenance = machines
      .filter((m) => {
        const due = m.maintenances[0]?.nextDueDate
        return due && new Date(due) < today
      })
      .map((m) => ({
        machineId: m.id,
        machineCode: m.code,
        machineName: m.name,
        line: m.line,
        dueDate: m.maintenances[0]!.nextDueDate,
        overdueDays: Math.ceil(
          (today.getTime() - new Date(m.maintenances[0]!.nextDueDate!).getTime()) / 86400000,
        ),
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays)

    const lowStocks = stocks
      .filter((s) => Number(s.quantity) < Number(s.minQuantity))
      .map((s) => ({
        sparePartId: s.sparePartId,
        code: s.sparePart.code,
        name: s.sparePart.name,
        unit: s.sparePart.unit,
        quantity: Number(s.quantity),
        minQuantity: Number(s.minQuantity),
      }))

    return {
      pendingBreakdowns,
      openWorkOrders,
      overdueMaintenance,
      expiringCertificates: expiringCertificates.map((c) => ({
        ...c,
        daysLeft: c.expiryDate
          ? Math.ceil((new Date(c.expiryDate).getTime() - today.getTime()) / 86400000)
          : null,
      })),
      lowStocks,
      pendingApprovals: {
        plans: pendingPlans,
        partRequests: pendingPartRequests,
      },
    }
  }
}
