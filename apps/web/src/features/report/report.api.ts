import api from '@/lib/axios'

// ============================================================
// TYPES
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
  estimatedFinishDate: string | null
  isLate: boolean
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
  efficiencyPct: number
  outputToday: number
}

export interface KpiResult {
  totalOutputToday: number
  totalOutputMtd: number
  overallPct: number
  lateStyleCount: number
  brokenMachineCount: number
  factoryStats: FactoryStat[]
  customerStats: CustomerStat[]
  styleStats: StyleStat[]
  lineEfficiencies: LineEfficiency[]
}

export interface AlertItem {
  type: 'LATE_ORDER' | 'MACHINE_MAINTENANCE' | 'TRANSFER_PENDING' | 'SLOW_PROGRESS'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  resourceId?: number
  resourceType?: string
}

export interface ReportSettings {
  cutoffHour: number
  alertSlowPct: number
}

export interface ColorSizeCell {
  colorId: number
  sizeId: number
  ordered: number
  produced: number
}

export interface ColorSizeStyle {
  styleId: number
  styleCode: string
  styleName: string
  colors: { id: number; name: string; hex: string | null }[]
  sizes: { id: number; code: string }[]
  cells: ColorSizeCell[]
  totalOrdered: number
  totalProduced: number
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const reportApi = {
  getProgress: (params?: { factoryId?: number; styleId?: number; stage?: string }) =>
    api.get<ProgressRow[]>('/report/progress', { params }).then((r) => r.data),

  getColorSize: (params?: { styleId?: number; stage?: string }) =>
    api.get<ColorSizeStyle[]>('/report/color-size', { params }).then((r) => r.data),

  getKpi: () => api.get<KpiResult>('/report/kpi').then((r) => r.data),

  getAlerts: () => api.get<AlertItem[]>('/report/alerts').then((r) => r.data),

  getSettings: () => api.get<ReportSettings>('/report/settings').then((r) => r.data),
}
