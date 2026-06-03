import api from '@/lib/axios'

// ============================================================
// TYPES
// ============================================================

export type ProductionStage = 'CUTTING' | 'SEWING' | 'QC' | 'PACKING'

export const STAGE_LABELS: Record<ProductionStage, string> = {
  CUTTING: 'Cắt',
  SEWING: 'May',
  QC: 'KCS',
  PACKING: 'Đóng gói',
}

export const STAGE_COLORS: Record<ProductionStage, string> = {
  CUTTING: 'bg-orange-100 text-orange-800',
  SEWING: 'bg-blue-100 text-blue-800',
  QC: 'bg-purple-100 text-purple-800',
  PACKING: 'bg-green-100 text-green-800',
}

export interface ColorRef { id: number; code: string; name: string; hex: string | null }
export interface SizeRef { id: number; code: string; name: string; sortOrder: number }

export interface StyleForLine {
  id: number
  code: string
  name: string
  sam: number | null
  customer?: { id: number; name: string }
  styleColors?: { colorId: number; color?: ColorRef }[]
  styleSizes?: { sizeId: number; size?: SizeRef }[]
}

export interface DailyOutput {
  id: number
  lineId: number
  styleId: number
  colorId: number | null
  sizeId: number | null
  stage: ProductionStage
  outputDate: string
  quantity: number
  enteredBy: number
  enteredAt: string
  isLocked: boolean
  style?: StyleForLine
  color?: ColorRef | null
  size?: SizeRef | null
}

export interface DailyOutputLog {
  id: number
  dailyOutputId: number
  quantity: number
  enteredBy: number
  enteredAt: string
}

export interface FactoryPlanSummary {
  id: number
  companyPlanId: number
  lineId: number
  plannedQuantity: number
  expectedFinishDate: string
  companyPlan?: {
    styleId: number
    style?: { id: number; code: string; name: string }
  }
}

export interface TodayOutputResult {
  date: string
  isPastCutoff: boolean
  cutoffHour: number
  outputs: DailyOutput[]
  factoryPlans: FactoryPlanSummary[]
}

export interface CreateOutputPayload {
  styleId: number
  colorId?: number
  sizeId?: number
  stage: ProductionStage
  quantity: number
  outputDate?: string
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const outputApi = {
  getSettings: () =>
    api.get<{ cutoffHour: number }>('/output/settings').then((r) => r.data),

  getMyStyles: () =>
    api.get<StyleForLine[]>('/output/styles').then((r) => r.data),

  getToday: () =>
    api.get<TodayOutputResult>('/output/today').then((r) => r.data),

  getHistory: (days = 7, lineId?: number) =>
    api
      .get<DailyOutput[]>('/output/history', { params: { days, lineId } })
      .then((r) => r.data),

  getLogs: (outputId: number) =>
    api.get<DailyOutputLog[]>(`/output/${outputId}/logs`).then((r) => r.data),

  upsert: (payload: CreateOutputPayload) =>
    api.post<DailyOutput>('/output', payload).then((r) => r.data),
}
