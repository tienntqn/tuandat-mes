import api from '@/lib/axios'

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

export const progressApi = {
  byStage: (params: { stage: string; factoryId?: number; styleId?: number }) =>
    api.get<ProgressRow[]>('/report/progress', { params }).then((r) => r.data),
}
