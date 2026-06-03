import api from '@/lib/axios'

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ giao',
  PARTIAL: 'Giao một phần',
  DELIVERED: 'Đã giao',
}

export interface DeliveryPlan {
  id: number
  poId: number
  plannedDate: string
  plannedQuantity: number
  actualDate: string | null
  actualQuantity: number | null
  status: string
  note: string | null
  po?: {
    id: number
    poNumber: string
    totalQuantity: number
    style?: { id: number; code: string; name: string }
  }
  createdAt: string
  deletedAt: string | null
}

export interface DeliveryPlanListResult {
  data: DeliveryPlan[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateDeliveryPlanDto = {
  poId: number
  plannedDate: string
  plannedQuantity: number
  actualDate?: string
  actualQuantity?: number
  status?: string
  note?: string
}
export type UpdateDeliveryPlanDto = Partial<CreateDeliveryPlanDto>

export const deliveryApi = {
  list: (params?: { poId?: number; status?: string; page?: number; pageSize?: number }) =>
    api.get<DeliveryPlanListResult>('/delivery-plans', { params }).then((r) => r.data),
  get: (id: number) => api.get<DeliveryPlan>(`/delivery-plans/${id}`).then((r) => r.data),
  create: (dto: CreateDeliveryPlanDto) => api.post<DeliveryPlan>('/delivery-plans', dto).then((r) => r.data),
  update: (id: number, dto: UpdateDeliveryPlanDto) =>
    api.patch<DeliveryPlan>(`/delivery-plans/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/delivery-plans/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/delivery-plans/${id}/restore`).then((r) => r.data),
}
