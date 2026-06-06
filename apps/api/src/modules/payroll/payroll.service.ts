import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import type { RequestUser } from '../../common/types/request-user.type'

// Khoảng thời gian 1 tháng [start, end)
interface MonthRange {
  start: Date
  end: Date
  month: string // YYYY-MM
}

export interface LinePayrollRow {
  lineId: number
  lineName: string
  factoryId: number
  factoryName: string
  workerCount: number
  totalQuantity: number
  totalMoney: number
  perWorkerMtd: number // lương/người tại thời điểm hiện tại
  predictedMoney: number
  perWorkerPredicted: number // dự đoán lương/người cuối tháng
  activeDays: number
}

export interface SectionPayroll {
  workerCount: number
  totalQuantity: number
  totalMoney: number
  perWorkerMtd: number
  predictedMoney: number
  perWorkerPredicted: number
  activeDays: number
}

export interface FactorySectionPayrollRow {
  factoryId: number
  factoryName: string
  cutting: SectionPayroll
  finishing: SectionPayroll
}

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  // Phân giải tham số month=YYYY-MM thành khoảng [đầu tháng, đầu tháng kế tiếp)
  private resolveMonth(month?: string): MonthRange {
    let y: number
    let m: number // 1-12
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [ys, ms] = month.split('-')
      y = parseInt(ys, 10)
      m = parseInt(ms, 10)
    } else {
      const now = new Date()
      y = now.getFullYear()
      m = now.getMonth() + 1
    }
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    return { start, end, month: `${y}-${String(m).padStart(2, '0')}` }
  }

  // Đơn giá hiệu lực của 1 PO = trợ giá nếu có, ngược lại đơn giá gốc
  private effectivePrice(po: {
    unitPrice: any
    subsidyPrice: any
  }): number {
    const v = po.subsidyPrice ?? po.unitPrice
    return v == null ? 0 : Number(v)
  }

  /**
   * Đơn giá hiệu lực theo Mã hàng = bình quân gia quyền theo totalQuantity các PO
   * (sản lượng May/Cắt ghi theo styleId nên cần quy về 1 đơn giá/mã hàng).
   */
  private async resolveStylePrices(
    styleIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>()
    if (styleIds.length === 0) return map
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { styleId: { in: styleIds }, deletedAt: null },
      select: {
        styleId: true,
        totalQuantity: true,
        unitPrice: true,
        subsidyPrice: true,
      },
    })
    const acc = new Map<number, { wSum: number; qSum: number; pSum: number; n: number }>()
    for (const po of pos) {
      const price = this.effectivePrice(po)
      const q = po.totalQuantity || 0
      const a = acc.get(po.styleId) ?? { wSum: 0, qSum: 0, pSum: 0, n: 0 }
      a.wSum += price * q
      a.qSum += q
      a.pSum += price
      a.n += 1
      acc.set(po.styleId, a)
    }
    for (const [styleId, a] of acc) {
      // Có trọng số (số lượng) → bình quân gia quyền; nếu tổng SL = 0 → bình quân thường
      const price = a.qSum > 0 ? a.wSum / a.qSum : a.n > 0 ? a.pSum / a.n : 0
      map.set(styleId, price)
    }
    return map
  }

  // Ngoại suy lương cuối tháng theo nhịp hiện tại
  private predict(money: number, activeDays: number, workingDays: number): number {
    if (activeDays <= 0) return money
    if (activeDays >= workingDays) return money
    return (money / activeDays) * workingDays
  }

  private perWorker(money: number, workers: number): number {
    return workers > 0 ? money / workers : 0
  }

  // ===== Lương theo CHUYỀN MAY =====
  async getLinePayroll(
    user: RequestUser,
    factoryId?: number,
    month?: string,
  ): Promise<{ month: string; rows: LinePayrollRow[] }> {
    const { start, end, month: monthStr } = this.resolveMonth(month)
    const workingDays = await this.settings.getNumber('PAYROLL_WORKING_DAYS', 26)
    const scope = user.dataScope

    // Danh sách chuyền trong phạm vi
    const lineWhere: any = { deletedAt: null }
    if (scope.type === 'LINE') lineWhere.id = scope.lineId
    else if (scope.type === 'FACTORY') lineWhere.factoryId = scope.factoryId
    else if (factoryId) lineWhere.factoryId = factoryId

    const lines = await this.prisma.productionLine.findMany({
      where: lineWhere,
      select: {
        id: true,
        name: true,
        workerCount: true,
        factoryId: true,
        factory: { select: { name: true } },
      },
      orderBy: [{ factoryId: 'asc' }, { lineNumber: 'asc' }],
    })
    if (lines.length === 0) return { month: monthStr, rows: [] }

    const lineIds = lines.map((l) => l.id)
    // Sản lượng May trong tháng theo chuyền
    const outputs = await this.prisma.dailyOutput.findMany({
      where: {
        stage: 'SEWING',
        lineId: { in: lineIds },
        outputDate: { gte: start, lt: end },
      },
      select: { lineId: true, styleId: true, quantity: true, outputDate: true },
    })

    const priceMap = await this.resolveStylePrices([
      ...new Set(outputs.map((o) => o.styleId)),
    ])

    // Đơn giá riêng của từng chuyền cho mã hàng (override, nếu có) — ưu tiên hơn giá PO
    const styleLines = await this.prisma.styleLine.findMany({
      where: { lineId: { in: lineIds }, unitPrice: { not: null } },
      select: { lineId: true, styleId: true, unitPrice: true },
    })
    const lineStylePrice = new Map<string, number>()
    for (const sl of styleLines) {
      if (sl.unitPrice != null) {
        lineStylePrice.set(`${sl.lineId}:${sl.styleId}`, Number(sl.unitPrice))
      }
    }

    // Gom theo chuyền
    const agg = new Map<
      number,
      { qty: number; money: number; days: Set<string> }
    >()
    for (const o of outputs) {
      const a = agg.get(o.lineId) ?? { qty: 0, money: 0, days: new Set<string>() }
      // Ưu tiên đơn giá riêng của chuyền, fallback về đơn giá hiệu lực theo PO của mã hàng
      const price =
        lineStylePrice.get(`${o.lineId}:${o.styleId}`) ?? priceMap.get(o.styleId) ?? 0
      a.qty += o.quantity
      a.money += o.quantity * price
      a.days.add(o.outputDate.toISOString().slice(0, 10))
      agg.set(o.lineId, a)
    }

    const rows: LinePayrollRow[] = lines.map((l) => {
      const a = agg.get(l.id) ?? { qty: 0, money: 0, days: new Set<string>() }
      const activeDays = a.days.size
      const predictedMoney = this.predict(a.money, activeDays, workingDays)
      return {
        lineId: l.id,
        lineName: l.name,
        factoryId: l.factoryId,
        factoryName: l.factory.name,
        workerCount: l.workerCount,
        totalQuantity: a.qty,
        totalMoney: Math.round(a.money),
        perWorkerMtd: Math.round(this.perWorker(a.money, l.workerCount)),
        predictedMoney: Math.round(predictedMoney),
        perWorkerPredicted: Math.round(
          this.perWorker(predictedMoney, l.workerCount),
        ),
        activeDays,
      }
    })
    return { month: monthStr, rows }
  }

  // ===== Lương theo TỔ CẮT / HOÀN THÀNH (cấp xưởng) =====
  async getSectionPayroll(
    user: RequestUser,
    factoryId?: number,
    month?: string,
  ): Promise<{ month: string; rows: FactorySectionPayrollRow[] }> {
    const { start, end, month: monthStr } = this.resolveMonth(month)
    const [workingDays, cuttingPct, finishingPct] = await Promise.all([
      this.settings.getNumber('PAYROLL_WORKING_DAYS', 26),
      this.settings.getNumber('CUTTING_RATE_PCT', 8),
      this.settings.getNumber('FINISHING_RATE_PCT', 5),
    ])
    const scope = user.dataScope

    // Xác định danh sách xưởng trong phạm vi
    const factoryWhere: any = { deletedAt: null }
    if (scope.type === 'FACTORY') factoryWhere.id = scope.factoryId
    else if (scope.type === 'LINE') {
      const line = await this.prisma.productionLine.findUnique({
        where: { id: scope.lineId },
        select: { factoryId: true },
      })
      factoryWhere.id = line?.factoryId ?? -1
    } else if (factoryId) factoryWhere.id = factoryId

    const factories = await this.prisma.factory.findMany({
      where: factoryWhere,
      select: {
        id: true,
        name: true,
        cuttingWorkerCount: true,
        finishingWorkerCount: true,
      },
      orderBy: { code: 'asc' },
    })
    if (factories.length === 0) return { month: monthStr, rows: [] }
    const factoryIds = factories.map((f) => f.id)

    // Sản lượng Cắt (theo styleId)
    const cutOutputs = await this.prisma.factorySectionOutput.findMany({
      where: {
        section: 'CUTTING',
        factoryId: { in: factoryIds },
        outputDate: { gte: start, lt: end },
      },
      select: {
        factoryId: true,
        styleId: true,
        quantity: true,
        outputDate: true,
      },
    })
    const cutPriceMap = await this.resolveStylePrices([
      ...new Set(cutOutputs.map((o) => o.styleId)),
    ])

    // Sản lượng Hoàn thành (theo PO → dùng giá PO trực tiếp)
    const finOutputs = await this.prisma.finishingOutput.findMany({
      where: {
        factoryId: { in: factoryIds },
        outputDate: { gte: start, lt: end },
      },
      select: {
        factoryId: true,
        packedQuantity: true,
        outputDate: true,
        po: { select: { unitPrice: true, subsidyPrice: true } },
      },
    })

    const cutAgg = new Map<number, { qty: number; money: number; days: Set<string> }>()
    for (const o of cutOutputs) {
      const a = cutAgg.get(o.factoryId) ?? { qty: 0, money: 0, days: new Set<string>() }
      const price = (cutPriceMap.get(o.styleId) ?? 0) * (cuttingPct / 100)
      a.qty += o.quantity
      a.money += o.quantity * price
      a.days.add(o.outputDate.toISOString().slice(0, 10))
      cutAgg.set(o.factoryId, a)
    }

    const finAgg = new Map<number, { qty: number; money: number; days: Set<string> }>()
    for (const o of finOutputs) {
      const a = finAgg.get(o.factoryId) ?? { qty: 0, money: 0, days: new Set<string>() }
      const price = this.effectivePrice(o.po) * (finishingPct / 100)
      a.qty += o.packedQuantity
      a.money += o.packedQuantity * price
      a.days.add(o.outputDate.toISOString().slice(0, 10))
      finAgg.set(o.factoryId, a)
    }

    const buildSection = (
      a: { qty: number; money: number; days: Set<string> } | undefined,
      workers: number,
    ): SectionPayroll => {
      const d = a ?? { qty: 0, money: 0, days: new Set<string>() }
      const activeDays = d.days.size
      const predictedMoney = this.predict(d.money, activeDays, workingDays)
      return {
        workerCount: workers,
        totalQuantity: d.qty,
        totalMoney: Math.round(d.money),
        perWorkerMtd: Math.round(this.perWorker(d.money, workers)),
        predictedMoney: Math.round(predictedMoney),
        perWorkerPredicted: Math.round(this.perWorker(predictedMoney, workers)),
        activeDays,
      }
    }

    const rows: FactorySectionPayrollRow[] = factories.map((f) => ({
      factoryId: f.id,
      factoryName: f.name,
      cutting: buildSection(cutAgg.get(f.id), f.cuttingWorkerCount),
      finishing: buildSection(finAgg.get(f.id), f.finishingWorkerCount),
    }))
    return { month: monthStr, rows }
  }
}
