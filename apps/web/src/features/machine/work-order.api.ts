import api from '@/lib/axios'
import type { ListResult } from './catalog.api'

// ============================================================
// PHIẾU SỬA CHỮA / PHIẾU BẢO DƯỠNG MMTB
// ============================================================

export type WorkType = 'REPAIR' | 'MAINTENANCE'
export type WorkOrderStatus = 'DRAFT' | 'IN_PROGRESS' | 'DONE' | 'HANDED_OVER' | 'CANCELLED'

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  REPAIR: 'Sửa chữa',
  MAINTENANCE: 'Bảo dưỡng',
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Nháp',
  IN_PROGRESS: 'Đang thực hiện',
  DONE: 'Đã xong — chờ bàn giao',
  HANDED_OVER: 'Đã bàn giao',
  CANCELLED: 'Đã hủy',
}

export const WORK_ORDER_STATUS_BADGE: Record<WorkOrderStatus, string> = {
  DRAFT: 'bg-secondary-transparent',
  IN_PROGRESS: 'bg-info-transparent',
  DONE: 'bg-warning-transparent',
  HANDED_OVER: 'bg-success-transparent',
  CANCELLED: 'bg-secondary-transparent',
}

export interface WorkOrderPart {
  id: number
  workOrderId: number
  sparePartId: number | null
  name: string
  unit: string | null
  quantity: number
  unitPrice: number | null
  amount: number | null
  fromStock: boolean
  note: string | null
  sparePart?: { id: number; code: string; name: string; unit: string | null } | null
}

export interface WorkOrder {
  id: number
  orderNo: string
  type: WorkType
  machineId: number
  factoryId: number
  breakdownReportId: number | null
  maintenanceRequestId: number | null
  planItemId: number | null
  status: WorkOrderStatus
  startedAt: string | null
  finishedAt: string | null
  performedBy: number
  assistants: string | null
  content: string
  findings: string | null
  result: string | null
  downtimeHours: number | null
  laborCost: number | null
  partsCost: number | null
  totalCost: number | null
  nextDueDate: string | null
  note: string | null
  createdAt: string
  machine?: {
    id: number; code: string; name: string; model: string | null; serialNo: string | null
    brandRef?: { id: number; name: string } | null
    category?: { id: number; name: string } | null
    line?: { id: number; name: string } | null
  }
  factory?: { id: number; code: string; name: string }
  breakdownReport?: { id: number; reportNo: string; symptom: string; severity: string } | null
  maintenanceRequest?: { id: number; requestNo: string; reason: string } | null
  planItem?: {
    id: number; plannedDate: string; content: string
    plan: { id: number; planNo: string; title: string }
  } | null
  parts?: WorkOrderPart[]
  handover?: { id: number; handoverNo: string; status: string } | null
}

export type WorkOrderPartInput = {
  sparePartId?: number
  name: string
  unit?: string
  quantity: number
  unitPrice?: number
  fromStock?: boolean
  note?: string
}

export type CreateWorkOrderDto = {
  type: WorkType
  machineId: number
  breakdownReportId?: number
  maintenanceRequestId?: number
  planItemId?: number
  content: string
  performedBy?: number
  assistants?: string
  findings?: string
  startedAt?: string
  note?: string
  parts?: WorkOrderPartInput[]
}

export type CompleteWorkOrderDto = {
  result: string
  finishedAt?: string
  downtimeHours?: number
  laborCost?: number
  nextDueDate?: string
  parts?: WorkOrderPartInput[]
  note?: string
}

export const workOrderApi = {
  list: (params?: { type?: string; status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<WorkOrder>>('/work-orders', { params }).then((r) => r.data),
  get: (id: number) => api.get<WorkOrder>(`/work-orders/${id}`).then((r) => r.data),
  create: (dto: CreateWorkOrderDto) => api.post<WorkOrder>('/work-orders', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateWorkOrderDto, 'machineId' | 'type'>>) =>
    api.patch<WorkOrder>(`/work-orders/${id}`, dto).then((r) => r.data),
  start: (id: number) => api.post<WorkOrder>(`/work-orders/${id}/start`).then((r) => r.data),
  complete: (id: number, dto: CompleteWorkOrderDto) =>
    api.post<WorkOrder>(`/work-orders/${id}/complete`, dto).then((r) => r.data),
  cancel: (id: number) => api.post<WorkOrder>(`/work-orders/${id}/cancel`).then((r) => r.data),
  delete: (id: number) => api.delete(`/work-orders/${id}`).then((r) => r.data),
}
