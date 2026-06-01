import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import type { RequestUser } from '../../common/types/request-user.type'

// ============================================================
// Kiểu dữ liệu trả về
// ============================================================

export interface ProgressRow {
  factoryId: number
  factoryName: string
  lineId: number
  lineName: string
  styleId: number
  styleCode: string
  styleName: string
  stage: string
  plannedQty: number
  actualQty: number
  pct: number
  startDate: string
  expectedFinishDate: string
  estimatedFinishDate: string | null // dự báo theo tốc độ
  isLate: boolean
}

export interface KpiResult {
  totalOutputToday: number
  totalOutputMtd: number   // tháng này
  overallPct: number
  lateStyleCount: number
  brokenMachineCount: number
  factoryStats: FactoryStat[]
  customerStats: CustomerStat[]
  styleStats: StyleStat[]
  lineEfficiencies: LineEfficiency[]
}

export interface FactoryStat {
  factoryId: number
  factoryName: string
  plannedQty: number
  actualQty: number
  pct: number
}

export interface CustomerStat {
  customerId: number
  customerName: string
  plannedQty: number
  actualQty: number
  pct: number
}

export interface StyleStat {
  styleId: number
  styleCode: string
  styleName: string
  plannedQty: number
  actualQty: number
  pct: number
  isLate: boolean
}

export interface LineEfficiency {
  lineId: number
  lineName: string
  factoryName: string
  // SAM-weighted efficiency: Σ(qty * sam) / plannedSamHours
  efficiencyPct: number
  outputToday: number
}

export interface AlertItem {
  type: 'LATE_ORDER' | 'MACHINE_MAINTENANCE' | 'TRANSFER_PENDING' | 'SLOW_PROGRESS'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  resourceId?: number
  resourceType?: string
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get alertSlowPct(): number {
    return parseInt(this.config.get('ALERT_SLOW_PCT') ?? '80', 10)
  }

  // Tính khoảng % expected đến nay theo timeline
  private expectedPctByNow(startDate: Date, endDate: Date): number {
    const now = new Date()
    const total = endDate.getTime() - startDate.getTime()
    if (total <= 0) return 100
    const elapsed = Math.min(now.getTime() - startDate.getTime(), total)
    return Math.max(0, Math.round((elapsed / total) * 100))
  }

  // Dự báo ngày hoàn thành dựa trên tốc độ trung bình
  private estimateFinish(
    startDate: Date,
    actualQty: number,
    plannedQty: number,
  ): string | null {
    if (actualQty <= 0) return null
    const elapsed = new Date().getTime() - startDate.getTime()
    const daysElapsed = elapsed / (1000 * 60 * 60 * 24)
    const rate = actualQty / daysElapsed // SP/ngày
    if (rate <= 0) return null
    const remaining = plannedQty - actualQty
    const daysLeft = Math.ceil(remaining / rate)
    const estimated = new Date()
    estimated.setDate(estimated.getDate() + daysLeft)
    return estimated.toISOString().slice(0, 10)
  }

  // Báo cáo tiến độ theo xưởng / mã hàng / công đoạn
  async getProgressReport(
    user: RequestUser,
    factoryId?: number,
    styleId?: number,
    stage?: string,
  ): Promise<ProgressRow[]> {
    // Data scope
    const factoryFilter: any = {}
    if (user.dataScope.type === 'FACTORY') factoryFilter.factoryId = user.dataScope.factoryId
    else if (user.dataScope.type === 'LINE') factoryFilter.id = { in: [] } // line scope không có báo cáo factory
    if (factoryId) factoryFilter.factoryId = factoryId

    // Lấy FactoryPlan kèm CompanyPlan, Line, Style
    const factoryPlans = await this.prisma.factoryPlan.findMany({
      where: {
        line: factoryId ? { factoryId } : user.dataScope.type === 'FACTORY'
          ? { factoryId: user.dataScope.factoryId }
          : {},
        ...(styleId ? { companyPlan: { styleId } } : {}),
      },
      include: {
        line: { include: { factory: true } },
        companyPlan: {
          include: { style: true },
        },
      },
    })

    const rows: ProgressRow[] = []

    for (const fp of factoryPlans) {
      const stages = stage ? [stage] : ['CUTTING', 'SEWING', 'QC', 'PACKING']
      for (const st of stages) {
        // Tổng sản lượng thực tế cho line + style + stage
        const agg = await this.prisma.dailyOutput.aggregate({
          where: {
            lineId: fp.lineId,
            styleId: fp.companyPlan.styleId,
            stage: st as any,
          },
          _sum: { quantity: true },
        })

        const actualQty = agg._sum.quantity ?? 0
        const plannedQty = fp.plannedQuantity
        const pct = plannedQty > 0 ? Math.round((actualQty / plannedQty) * 100) : 0
        const expectedPct = this.expectedPctByNow(
          new Date(fp.companyPlan.startDate ?? fp.companyPlan.createdAt),
          new Date(fp.expectedFinishDate),
        )
        const isLate = pct < expectedPct * (this.alertSlowPct / 100)

        rows.push({
          factoryId: fp.line.factoryId,
          factoryName: fp.line.factory.name,
          lineId: fp.lineId,
          lineName: fp.line.name,
          styleId: fp.companyPlan.styleId,
          styleCode: fp.companyPlan.style.code,
          styleName: fp.companyPlan.style.name,
          stage: st,
          plannedQty,
          actualQty,
          pct,
          startDate: fp.companyPlan.startDate
            ? new Date(fp.companyPlan.startDate).toISOString().slice(0, 10)
            : new Date(fp.companyPlan.createdAt).toISOString().slice(0, 10),
          expectedFinishDate: new Date(fp.expectedFinishDate).toISOString().slice(0, 10),
          estimatedFinishDate: this.estimateFinish(
            new Date(fp.companyPlan.startDate ?? fp.companyPlan.createdAt),
            actualQty,
            plannedQty,
          ),
          isLate,
        })
      }
    }

    return rows
  }

  // KPI tổng hợp cho Dashboard BGĐ
  async getKpi(user: RequestUser): Promise<KpiResult> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const factoryFilter = user.dataScope.type === 'FACTORY'
      ? { line: { factoryId: user.dataScope.factoryId } }
      : {}

    // Sản lượng hôm nay
    const todayAgg = await this.prisma.dailyOutput.aggregate({
      where: { outputDate: today, ...factoryFilter },
      _sum: { quantity: true },
    })

    // Sản lượng tháng này
    const mtdAgg = await this.prisma.dailyOutput.aggregate({
      where: { outputDate: { gte: monthStart }, ...factoryFilter },
      _sum: { quantity: true },
    })

    // Tất cả FactoryPlan (active)
    const factoryPlans = await this.prisma.factoryPlan.findMany({
      where: user.dataScope.type === 'FACTORY'
        ? { line: { factoryId: user.dataScope.factoryId } }
        : {},
      include: {
        line: { include: { factory: true } },
        companyPlan: { include: { style: { include: { customer: true } } } },
      },
    })

    // Tổng plannedQty toàn hệ thống
    const totalPlanned = factoryPlans.reduce((s, fp) => s + fp.plannedQuantity, 0)

    // Sản lượng thực tế tích lũy
    const allOutputAgg = await this.prisma.dailyOutput.aggregate({
      where: factoryFilter,
      _sum: { quantity: true },
    })
    const totalActual = allOutputAgg._sum.quantity ?? 0
    const overallPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

    // Số máy hỏng
    const brokenMachineCount = await this.prisma.machine.count({
      where: {
        status: 'BROKEN',
        ...(user.dataScope.type === 'FACTORY' ? { factoryId: user.dataScope.factoryId } : {}),
      },
    })

    // Factory stats
    const factoryMap = new Map<number, FactoryStat>()
    for (const fp of factoryPlans) {
      const fId = fp.line.factoryId
      if (!factoryMap.has(fId)) {
        factoryMap.set(fId, {
          factoryId: fId,
          factoryName: fp.line.factory.name,
          plannedQty: 0,
          actualQty: 0,
          pct: 0,
        })
      }
      factoryMap.get(fId)!.plannedQty += fp.plannedQuantity
    }

    // Lấy output thực tế theo factory
    for (const [fId, stat] of factoryMap) {
      const agg = await this.prisma.dailyOutput.aggregate({
        where: { line: { factoryId: fId } },
        _sum: { quantity: true },
      })
      stat.actualQty = agg._sum.quantity ?? 0
      stat.pct = stat.plannedQty > 0 ? Math.round((stat.actualQty / stat.plannedQty) * 100) : 0
    }

    // Customer stats
    const customerMap = new Map<number, CustomerStat>()
    for (const fp of factoryPlans) {
      const c = fp.companyPlan.style.customer
      if (!c) continue
      if (!customerMap.has(c.id)) {
        customerMap.set(c.id, { customerId: c.id, customerName: c.name, plannedQty: 0, actualQty: 0, pct: 0 })
      }
      customerMap.get(c.id)!.plannedQty += fp.plannedQuantity
    }

    // Lấy actual theo customer (via style -> customer)
    for (const [cId, stat] of customerMap) {
      const agg = await this.prisma.dailyOutput.aggregate({
        where: { style: { customerId: cId } },
        _sum: { quantity: true },
      })
      stat.actualQty = agg._sum.quantity ?? 0
      stat.pct = stat.plannedQty > 0 ? Math.round((stat.actualQty / stat.plannedQty) * 100) : 0
    }

    // Style stats
    const styleMap = new Map<number, StyleStat>()
    for (const fp of factoryPlans) {
      const s = fp.companyPlan.style
      if (!styleMap.has(s.id)) {
        styleMap.set(s.id, {
          styleId: s.id,
          styleCode: s.code,
          styleName: s.name,
          plannedQty: 0,
          actualQty: 0,
          pct: 0,
          isLate: false,
        })
      }
      styleMap.get(s.id)!.plannedQty += fp.plannedQuantity
    }

    for (const [sId, stat] of styleMap) {
      const agg = await this.prisma.dailyOutput.aggregate({
        where: { styleId: sId, ...factoryFilter },
        _sum: { quantity: true },
      })
      stat.actualQty = agg._sum.quantity ?? 0
      stat.pct = stat.plannedQty > 0 ? Math.round((stat.actualQty / stat.plannedQty) * 100) : 0
      // Đánh dấu chậm nếu % < 80% kỳ vọng
      const fp0 = factoryPlans.find((fp) => fp.companyPlan.styleId === sId)
      if (fp0) {
        const expectedPct = this.expectedPctByNow(
          new Date(fp0.companyPlan.startDate ?? fp0.companyPlan.createdAt),
          new Date(fp0.expectedFinishDate),
        )
        stat.isLate = stat.pct < expectedPct * (this.alertSlowPct / 100)
      }
    }

    const lateStyleCount = Array.from(styleMap.values()).filter((s) => s.isLate).length

    // Line efficiency (SAM-weighted)
    const lineEfficiencies = await this.getLineEfficiencies(user)

    return {
      totalOutputToday: todayAgg._sum.quantity ?? 0,
      totalOutputMtd: mtdAgg._sum.quantity ?? 0,
      overallPct,
      lateStyleCount,
      brokenMachineCount,
      factoryStats: Array.from(factoryMap.values()),
      customerStats: Array.from(customerMap.values()),
      styleStats: Array.from(styleMap.values()),
      lineEfficiencies,
    }
  }

  // Hiệu suất chuyền theo SAM: sum(qty * sam) / (plannedQty * sam)
  private async getLineEfficiencies(user: RequestUser): Promise<LineEfficiency[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lines = await this.prisma.productionLine.findMany({
      where: {
        deletedAt: null,
        ...(user.dataScope.type === 'FACTORY' ? { factoryId: user.dataScope.factoryId } : {}),
        ...(user.dataScope.type === 'LINE' ? { id: user.lineId! } : {}),
      },
      include: {
        factory: true,
        factoryPlans: {
          include: { companyPlan: { include: { style: true } } },
        },
        dailyOutputs: {
          where: { outputDate: today },
          include: { style: true },
        },
      },
    })

    return lines.map((line) => {
      // Sản lượng hôm nay của chuyền
      const outputToday = line.dailyOutputs.reduce((s, o) => s + o.quantity, 0)

      // SAM-weighted: sum(qty * sam) cho outputs hôm nay
      const samWeightedActual = line.dailyOutputs.reduce((s, o) => {
        const sam = Number(o.style?.sam ?? 0)
        return s + o.quantity * sam
      }, 0)

      // plannedQty từ FactoryPlan active
      const plannedQty = line.factoryPlans.reduce((s, fp) => s + fp.plannedQuantity, 0)
      // Ước tính planned per day = total / 20 ngày sản xuất
      const plannedPerDay = Math.round(plannedQty / 20)

      const samWeightedPlanned = line.factoryPlans.reduce((s, fp) => {
        const sam = Number(fp.companyPlan.style?.sam ?? 0)
        return s + (plannedQty / 20) * sam
      }, 0)

      const efficiencyPct =
        samWeightedPlanned > 0
          ? Math.round((samWeightedActual / samWeightedPlanned) * 100)
          : 0

      return {
        lineId: line.id,
        lineName: line.name,
        factoryName: line.factory.name,
        efficiencyPct,
        outputToday,
      }
    })
  }

  // Cảnh báo thông minh — tính từ data hiện có (không cần bảng riêng)
  async getAlerts(user: RequestUser): Promise<AlertItem[]> {
    const alerts: AlertItem[] = []

    // 1. Máy đến hạn bảo dưỡng (nextDueDate <= 7 ngày tới)
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)
    const dueMachines = await this.prisma.machine.findMany({
      where: {
        deletedAt: null,
        ...(user.dataScope.type === 'FACTORY' ? { factoryId: user.dataScope.factoryId } : {}),
        maintenances: {
          some: { nextDueDate: { lte: soon } },
        },
      },
      include: { maintenances: { orderBy: { nextDueDate: 'asc' }, take: 1 } },
    })
    for (const m of dueMachines) {
      const due = m.maintenances[0]?.nextDueDate
      alerts.push({
        type: 'MACHINE_MAINTENANCE',
        severity: 'MEDIUM',
        title: `Máy ${m.code} sắp đến hạn bảo dưỡng`,
        description: `Hạn bảo dưỡng: ${due ? new Date(due).toLocaleDateString('vi-VN') : 'Chưa rõ'}`,
        resourceId: m.id,
        resourceType: 'Machine',
      })
    }

    // 2. Máy hỏng
    const brokenMachines = await this.prisma.machine.findMany({
      where: {
        status: 'BROKEN',
        deletedAt: null,
        ...(user.dataScope.type === 'FACTORY' ? { factoryId: user.dataScope.factoryId } : {}),
      },
    })
    for (const m of brokenMachines) {
      alerts.push({
        type: 'MACHINE_MAINTENANCE',
        severity: 'HIGH',
        title: `Máy ${m.code} đang hỏng`,
        description: `Cần sửa chữa ngay`,
        resourceId: m.id,
        resourceType: 'Machine',
      })
    }

    // 3. Điều chuyển máy chờ xác nhận
    const pendingTransfers = await this.prisma.machineTransfer.findMany({
      where: {
        status: { in: ['PENDING', 'SENDER_CONFIRMED'] },
        ...(user.dataScope.type === 'FACTORY'
          ? {
              OR: [
                { fromFactoryId: user.factoryId! },
                { toFactoryId: user.factoryId! },
              ],
            }
          : {}),
      },
      include: { machine: true },
    })
    for (const t of pendingTransfers) {
      alerts.push({
        type: 'TRANSFER_PENDING',
        severity: 'MEDIUM',
        title: `Điều chuyển máy ${t.machine.code} chờ xác nhận`,
        description: `Lệnh #${t.transferOrderNo} — trạng thái: ${t.status}`,
        resourceId: t.id,
        resourceType: 'MachineTransfer',
      })
    }

    // 4. Tiến độ chậm (tính nhanh ở level FactoryPlan)
    const factoryPlans = await this.prisma.factoryPlan.findMany({
      where: user.dataScope.type === 'FACTORY'
        ? { line: { factoryId: user.dataScope.factoryId } }
        : {},
      include: {
        line: true,
        companyPlan: { include: { style: true } },
      },
    })

    for (const fp of factoryPlans) {
      const agg = await this.prisma.dailyOutput.aggregate({
        where: { lineId: fp.lineId, styleId: fp.companyPlan.styleId },
        _sum: { quantity: true },
      })
      const actual = agg._sum.quantity ?? 0
      const pct = fp.plannedQuantity > 0 ? (actual / fp.plannedQuantity) * 100 : 0
      const expectedPct = this.expectedPctByNow(
        new Date(fp.companyPlan.startDate ?? fp.companyPlan.createdAt),
        new Date(fp.expectedFinishDate),
      )
      if (pct < expectedPct * (this.alertSlowPct / 100) && expectedPct > 10) {
        alerts.push({
          type: 'SLOW_PROGRESS',
          severity: pct < 50 ? 'HIGH' : 'MEDIUM',
          title: `Tiến độ chậm: ${fp.companyPlan.style.code} — Chuyền ${fp.line.name}`,
          description: `Thực tế ${Math.round(pct)}% / Kỳ vọng ${expectedPct}%`,
          resourceId: fp.id,
          resourceType: 'FactoryPlan',
        })
      }
    }

    // Sắp xếp theo severity
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return alerts.sort((a, b) => order[a.severity] - order[b.severity])
  }

  // Settings (cutoff, alert threshold)
  getSettings() {
    return {
      cutoffHour: parseInt(this.config.get('OUTPUT_CUTOFF_HOUR') ?? '19', 10),
      alertSlowPct: this.alertSlowPct,
    }
  }
}
