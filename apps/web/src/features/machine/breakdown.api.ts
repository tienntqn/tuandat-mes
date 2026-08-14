import api from '@/lib/axios'
import type { ListResult } from './catalog.api'

// ============================================================
// KHỐI SỬA CHỮA — Phiếu báo hỏng & Biên bản sự cố
// ============================================================

export type BreakdownSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type BreakdownStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'IN_REPAIR' | 'RESOLVED' | 'CANCELLED'

export const SEVERITY_LABELS: Record<BreakdownSeverity, string> = {
  LOW: 'Nhẹ',
  MEDIUM: 'Trung bình',
  HIGH: 'Nặng',
  CRITICAL: 'Nghiêm trọng',
}

export const SEVERITY_BADGE: Record<BreakdownSeverity, string> = {
  LOW: 'bg-secondary-transparent',
  MEDIUM: 'bg-info-transparent',
  HIGH: 'bg-warning-transparent',
  CRITICAL: 'bg-danger-transparent',
}

export const BREAKDOWN_STATUS_LABELS: Record<BreakdownStatus, string> = {
  REPORTED: 'Mới báo hỏng',
  ACKNOWLEDGED: 'Đã tiếp nhận',
  IN_REPAIR: 'Đang sửa chữa',
  RESOLVED: 'Đã xử lý xong',
  CANCELLED: 'Đã hủy',
}

export const BREAKDOWN_STATUS_BADGE: Record<BreakdownStatus, string> = {
  REPORTED: 'bg-danger-transparent',
  ACKNOWLEDGED: 'bg-warning-transparent',
  IN_REPAIR: 'bg-info-transparent',
  RESOLVED: 'bg-success-transparent',
  CANCELLED: 'bg-secondary-transparent',
}

export interface BreakdownReport {
  id: number
  reportNo: string
  machineId: number
  factoryId: number
  lineId: number | null
  severity: BreakdownSeverity
  status: BreakdownStatus
  symptom: string
  stoppedProduction: boolean
  imageUrls: string[]
  reportedBy: number
  reportedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  note: string | null
  machine?: {
    id: number; code: string; name: string; model: string | null; serialNo: string | null
    brandRef?: { id: number; name: string } | null
    category?: { id: number; name: string } | null
  }
  factory?: { id: number; code: string; name: string }
  line?: { id: number; name: string; lineNumber: number } | null
  incidentReport?: { id: number; incidentNo: string } | null
  workOrders?: { id: number; orderNo: string; status: string }[]
}

export type CreateBreakdownDto = {
  machineId: number
  lineId?: number
  severity?: BreakdownSeverity
  symptom: string
  stoppedProduction?: boolean
  imageUrls?: string[]
  note?: string
}

export const breakdownApi = {
  list: (params?: { status?: string; severity?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<BreakdownReport>>('/breakdown-reports', { params }).then((r) => r.data),
  get: (id: number) => api.get<BreakdownReport>(`/breakdown-reports/${id}`).then((r) => r.data),
  create: (dto: CreateBreakdownDto) => api.post<BreakdownReport>('/breakdown-reports', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateBreakdownDto, 'machineId'>>) =>
    api.patch<BreakdownReport>(`/breakdown-reports/${id}`, dto).then((r) => r.data),
  acknowledge: (id: number) => api.post<BreakdownReport>(`/breakdown-reports/${id}/acknowledge`).then((r) => r.data),
  resolve: (id: number) => api.post<BreakdownReport>(`/breakdown-reports/${id}/resolve`).then((r) => r.data),
  cancel: (id: number) => api.post<BreakdownReport>(`/breakdown-reports/${id}/cancel`).then((r) => r.data),
}

// ===== Biên bản sự cố =====

export interface IncidentReport {
  id: number
  incidentNo: string
  machineId: number
  factoryId: number
  breakdownReportId: number | null
  incidentDate: string
  description: string
  cause: string | null
  consequence: string | null
  downtimeHours: number | null
  damageValue: number | null
  responsibleParty: string | null
  preventiveAction: string | null
  witnesses: string | null
  imageUrls: string[]
  createdAt: string
  machine?: { id: number; code: string; name: string; model: string | null; serialNo: string | null }
  factory?: { id: number; code: string; name: string }
  breakdownReport?: { id: number; reportNo: string; symptom: string } | null
}

export type CreateIncidentDto = {
  machineId: number
  breakdownReportId?: number
  incidentDate: string
  description: string
  cause?: string
  consequence?: string
  downtimeHours?: number
  damageValue?: number
  responsibleParty?: string
  preventiveAction?: string
  witnesses?: string
  imageUrls?: string[]
}

export const incidentApi = {
  list: (params?: { machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<IncidentReport>>('/incident-reports', { params }).then((r) => r.data),
  get: (id: number) => api.get<IncidentReport>(`/incident-reports/${id}`).then((r) => r.data),
  create: (dto: CreateIncidentDto) => api.post<IncidentReport>('/incident-reports', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateIncidentDto, 'machineId'>>) =>
    api.patch<IncidentReport>(`/incident-reports/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/incident-reports/${id}`).then((r) => r.data),
}
