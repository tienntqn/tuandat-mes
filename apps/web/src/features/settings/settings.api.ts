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
  // Ngưỡng chi phí phải trình công ty duyệt (0 = mọi hồ sơ đều qua 2 cấp)
  machineCompanyApprovalThreshold: number
  // Số ngày báo trước khi chứng chỉ / kiểm định máy hết hạn
  machineCertAlertDays: number
}

export interface UpdateAppSettings {
  qcReportingEnabled?: boolean
  cuttingRatePct?: number
  finishingRatePct?: number
  payrollWorkingDays?: number
  qrPrinterName?: string
  qrLabelWidthMm?: number
  qrLabelHeightMm?: number
  machineCompanyApprovalThreshold?: number
  machineCertAlertDays?: number
}

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then((r) => r.data),
  update: (dto: UpdateAppSettings) =>
    api.patch<AppSettings>('/settings', dto).then((r) => r.data),
}
