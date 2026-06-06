import api from '@/lib/axios'

export interface AppSettings {
  cutoffHour: number
  qcReportingEnabled: boolean
  cuttingRatePct: number
  finishingRatePct: number
  payrollWorkingDays: number
  qrPrinterName: string
  qrLabelWidthMm: number
  qrLabelHeightMm: number
}

export interface UpdateAppSettings {
  qcReportingEnabled?: boolean
  cuttingRatePct?: number
  finishingRatePct?: number
  payrollWorkingDays?: number
  qrPrinterName?: string
  qrLabelWidthMm?: number
  qrLabelHeightMm?: number
}

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then((r) => r.data),
  update: (dto: UpdateAppSettings) =>
    api.patch<AppSettings>('/settings', dto).then((r) => r.data),
}
