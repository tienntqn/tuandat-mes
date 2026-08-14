import api from '@/lib/axios'
import type { ListResult } from './catalog.api'
import type { WorkType } from './work-order.api'

// ============================================================
// YÊU CẦU MUA VẬT TƯ SỬA CHỮA / BẢO DƯỠNG (duyệt 2 cấp)
// ============================================================

export type PartRequestStatus =
  | 'DRAFT' | 'PENDING_FACTORY' | 'PENDING_COMPANY' | 'APPROVED'
  | 'PURCHASED' | 'REJECTED' | 'CANCELLED'

export const PART_REQUEST_STATUS_LABELS: Record<PartRequestStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_FACTORY: 'Chờ GĐ xưởng duyệt',
  PENDING_COMPANY: 'Chờ công ty duyệt',
  APPROVED: 'Đã duyệt — chờ mua',
  PURCHASED: 'Đã mua & nhập kho',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
}

export const PART_REQUEST_STATUS_BADGE: Record<PartRequestStatus, string> = {
  DRAFT: 'bg-secondary-transparent',
  PENDING_FACTORY: 'bg-warning-transparent',
  PENDING_COMPANY: 'bg-warning-transparent',
  APPROVED: 'bg-primary-transparent',
  PURCHASED: 'bg-success-transparent',
  REJECTED: 'bg-danger-transparent',
  CANCELLED: 'bg-secondary-transparent',
}

export interface PartRequestItem {
  id: number
  requestId: number
  sparePartId: number | null
  name: string
  unit: string | null
  quantity: number
  stockQuantity: number | null
  estimatedPrice: number | null
  amount: number | null
  receivedQuantity: number
  note: string | null
  sparePart?: { id: number; code: string; name: string; unit: string | null } | null
}

export interface PartRequest {
  id: number
  requestNo: string
  type: WorkType
  factoryId: number
  workPlanId: number | null
  workOrderId: number | null
  breakdownReportId: number | null
  title: string
  reason: string | null
  requestDate: string
  neededDate: string | null
  status: PartRequestStatus
  totalAmount: number | null
  factoryApprovedAt: string | null
  companyApprovedAt: string | null
  rejectReason: string | null
  note: string | null
  createdAt: string
  factory?: { id: number; code: string; name: string }
  workPlan?: { id: number; planNo: string; title: string } | null
  workOrder?: { id: number; orderNo: string; content: string } | null
  breakdownReport?: { id: number; reportNo: string; symptom: string } | null
  items?: PartRequestItem[]
}

export type PartRequestItemInput = {
  sparePartId?: number
  name: string
  unit?: string
  quantity: number
  estimatedPrice?: number
  note?: string
}

export type CreatePartRequestDto = {
  type: WorkType
  factoryId?: number
  title: string
  workPlanId?: number
  workOrderId?: number
  breakdownReportId?: number
  reason?: string
  requestDate: string
  neededDate?: string
  note?: string
  items: PartRequestItemInput[]
}

export type ReceivePartRequestDto = {
  items: { itemId: number; quantity: number; unitPrice?: number }[]
  supplier?: string
  documentNo?: string
  movementDate?: string
  note?: string
}

/** Nhu cầu vật tư tổng hợp từ định mức của một kế hoạch. */
export interface MaterialNeedRow {
  sparePartId: number | null
  code: string | null
  name: string
  unit: string | null
  required: number
  machines: string[]
  inStock: number
  shortage: number
}

export interface MaterialNeeds {
  plan: { id: number; planNo: string; title: string; type: WorkType; factoryId: number }
  rows: MaterialNeedRow[]
}

export const partRequestApi = {
  list: (params?: { type?: string; status?: string; factoryId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<PartRequest>>('/part-requests', { params }).then((r) => r.data),
  get: (id: number) => api.get<PartRequest>(`/part-requests/${id}`).then((r) => r.data),
  materialNeeds: (workPlanId: number) =>
    api.get<MaterialNeeds>(`/part-requests/material-needs/${workPlanId}`).then((r) => r.data),
  create: (dto: CreatePartRequestDto) => api.post<PartRequest>('/part-requests', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreatePartRequestDto, 'type' | 'factoryId'>>) =>
    api.patch<PartRequest>(`/part-requests/${id}`, dto).then((r) => r.data),
  submit: (id: number) => api.post<PartRequest>(`/part-requests/${id}/submit`).then((r) => r.data),
  approve: (id: number) => api.post<PartRequest>(`/part-requests/${id}/approve`).then((r) => r.data),
  reject: (id: number, rejectReason: string) =>
    api.post<PartRequest>(`/part-requests/${id}/reject`, { rejectReason }).then((r) => r.data),
  receive: (id: number, dto: ReceivePartRequestDto) =>
    api.post<PartRequest>(`/part-requests/${id}/receive`, dto).then((r) => r.data),
  cancel: (id: number) => api.post<PartRequest>(`/part-requests/${id}/cancel`).then((r) => r.data),
  delete: (id: number) => api.delete(`/part-requests/${id}`).then((r) => r.data),
}
