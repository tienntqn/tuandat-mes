import api from '@/lib/axios'
import type { ListResult } from './catalog.api'
import type { WorkType } from './work-order.api'

// ============================================================
// KHỐI BẢO DƯỠNG — Yêu cầu bảo dưỡng · Kế hoạch (duyệt 2 cấp) · Dự tính
// ============================================================

export type MaintenanceRequestStatus = 'PENDING' | 'ACCEPTED' | 'PLANNED' | 'DONE' | 'REJECTED'

export const REQUEST_STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  PENDING: 'Chờ tiếp nhận',
  ACCEPTED: 'Đã tiếp nhận',
  PLANNED: 'Đã đưa vào kế hoạch',
  DONE: 'Đã thực hiện',
  REJECTED: 'Đã từ chối',
}

export const REQUEST_STATUS_BADGE: Record<MaintenanceRequestStatus, string> = {
  PENDING: 'bg-warning-transparent',
  ACCEPTED: 'bg-info-transparent',
  PLANNED: 'bg-primary-transparent',
  DONE: 'bg-success-transparent',
  REJECTED: 'bg-danger-transparent',
}

export interface MaintenanceRequest {
  id: number
  requestNo: string
  machineId: number
  factoryId: number
  requestedBy: number
  requestedAt: string
  desiredDate: string | null
  reason: string
  status: MaintenanceRequestStatus
  handledAt: string | null
  rejectReason: string | null
  note: string | null
  machine?: {
    id: number; code: string; name: string; model: string | null; serialNo: string | null
    category?: { id: number; name: string } | null
    line?: { id: number; name: string } | null
  }
  factory?: { id: number; code: string; name: string }
  workOrders?: { id: number; orderNo: string; status: string }[]
}

export type CreateMaintenanceRequestDto = {
  machineId: number
  reason: string
  desiredDate?: string
  note?: string
}

export const maintenanceRequestApi = {
  list: (params?: { status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<MaintenanceRequest>>('/maintenance-requests', { params }).then((r) => r.data),
  get: (id: number) => api.get<MaintenanceRequest>(`/maintenance-requests/${id}`).then((r) => r.data),
  create: (dto: CreateMaintenanceRequestDto) =>
    api.post<MaintenanceRequest>('/maintenance-requests', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateMaintenanceRequestDto, 'machineId'>>) =>
    api.patch<MaintenanceRequest>(`/maintenance-requests/${id}`, dto).then((r) => r.data),
  accept: (id: number) => api.post<MaintenanceRequest>(`/maintenance-requests/${id}/accept`).then((r) => r.data),
  reject: (id: number, rejectReason: string) =>
    api.post<MaintenanceRequest>(`/maintenance-requests/${id}/reject`, { rejectReason }).then((r) => r.data),
  delete: (id: number) => api.delete(`/maintenance-requests/${id}`).then((r) => r.data),
}

// ===== Kế hoạch sửa chữa / bảo dưỡng =====

export type WorkPlanStatus =
  | 'DRAFT' | 'PENDING_FACTORY' | 'PENDING_COMPANY' | 'APPROVED'
  | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'

export const PLAN_STATUS_LABELS: Record<WorkPlanStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_FACTORY: 'Chờ GĐ xưởng duyệt',
  PENDING_COMPANY: 'Chờ công ty duyệt',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang triển khai',
  COMPLETED: 'Đã hoàn thành',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
}

export const PLAN_STATUS_BADGE: Record<WorkPlanStatus, string> = {
  DRAFT: 'bg-secondary-transparent',
  PENDING_FACTORY: 'bg-warning-transparent',
  PENDING_COMPANY: 'bg-warning-transparent',
  APPROVED: 'bg-primary-transparent',
  IN_PROGRESS: 'bg-info-transparent',
  COMPLETED: 'bg-success-transparent',
  REJECTED: 'bg-danger-transparent',
  CANCELLED: 'bg-secondary-transparent',
}

export interface WorkPlanItem {
  id: number
  planId: number
  machineId: number
  normId: number | null
  plannedDate: string
  content: string
  estimatedCost: number | null
  note: string | null
  machine?: {
    id: number; code: string; name: string
    category?: { id: number; name: string } | null
    line?: { id: number; name: string } | null
  }
  workOrder?: { id: number; orderNo: string; status: string } | null
}

export interface WorkPlan {
  id: number
  planNo: string
  type: WorkType
  factoryId: number
  title: string
  periodFrom: string
  periodTo: string
  status: WorkPlanStatus
  totalEstimatedCost: number | null
  note: string | null
  factoryApprovedAt: string | null
  companyApprovedAt: string | null
  rejectReason: string | null
  createdAt: string
  factory?: { id: number; code: string; name: string }
  items?: WorkPlanItem[]
}

export type WorkPlanItemInput = {
  machineId: number
  normId?: number
  plannedDate: string
  content: string
  estimatedCost?: number
  note?: string
}

export type CreateWorkPlanDto = {
  type: WorkType
  factoryId?: number
  title: string
  periodFrom: string
  periodTo: string
  note?: string
  items?: WorkPlanItemInput[]
}

/** Một dòng dự tính bảo dưỡng do hệ thống tính từ định mức + lần bảo dưỡng cuối. */
export interface MaintenanceForecastRow {
  machineId: number
  machineCode: string
  machineName: string
  factory?: { id: number; name: string } | null
  line?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  norm: {
    id: number
    code: string
    name: string
    intervalDays: number
    estimatedCost: number | null
    checklist: string | null
    items: { id: number; name: string; unit: string | null; quantity: number; sparePartId: number | null }[]
  } | null
  lastMaintenanceDate: string | null
  dueDate: string | null
  isOverdue: boolean
  daysUntilDue: number | null
}

export const workPlanApi = {
  list: (params?: { type?: string; status?: string; factoryId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<WorkPlan>>('/work-plans', { params }).then((r) => r.data),
  get: (id: number) => api.get<WorkPlan>(`/work-plans/${id}`).then((r) => r.data),
  forecast: (params?: { daysAhead?: number; factoryId?: number }) =>
    api.get<MaintenanceForecastRow[]>('/work-plans/forecast', { params }).then((r) => r.data),
  create: (dto: CreateWorkPlanDto) => api.post<WorkPlan>('/work-plans', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateWorkPlanDto, 'type' | 'factoryId'>>) =>
    api.patch<WorkPlan>(`/work-plans/${id}`, dto).then((r) => r.data),
  submit: (id: number) => api.post<WorkPlan>(`/work-plans/${id}/submit`).then((r) => r.data),
  approve: (id: number) => api.post<WorkPlan>(`/work-plans/${id}/approve`).then((r) => r.data),
  reject: (id: number, rejectReason: string) =>
    api.post<WorkPlan>(`/work-plans/${id}/reject`, { rejectReason }).then((r) => r.data),
  start: (id: number) => api.post<WorkPlan>(`/work-plans/${id}/start`).then((r) => r.data),
  complete: (id: number) => api.post<WorkPlan>(`/work-plans/${id}/complete`).then((r) => r.data),
  cancel: (id: number) => api.post<WorkPlan>(`/work-plans/${id}/cancel`).then((r) => r.data),
  delete: (id: number) => api.delete(`/work-plans/${id}`).then((r) => r.data),
}
