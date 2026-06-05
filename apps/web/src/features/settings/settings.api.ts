import api from '@/lib/axios'

export interface AppSettings {
  cutoffHour: number
  qcReportingEnabled: boolean
}

export interface UpdateAppSettings {
  qcReportingEnabled?: boolean
}

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then((r) => r.data),
  update: (dto: UpdateAppSettings) =>
    api.patch<AppSettings>('/settings', dto).then((r) => r.data),
}
