import api from '@/lib/axios'

export const PO_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang sản xuất',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy',
}

export interface PurchaseOrder {
  id: number
  poNumber: string
  styleId: number
  totalQuantity: number
  deliveryDate: string
  status: string
  style?: {
    id: number
    code: string
    name: string
    customer?: { id: number; name: string }
  }
  createdAt: string
  deletedAt: string | null
}

export interface POListResult {
  data: PurchaseOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreatePODto = {
  poNumber: string
  styleId: number
  totalQuantity: number
  deliveryDate: string
  status?: string
}
export type UpdatePODto = Partial<CreatePODto>

export const poApi = {
  list: (params?: { search?: string; styleId?: number; status?: string; page?: number; pageSize?: number }) =>
    api.get<POListResult>('/purchase-orders', { params }).then((r) => r.data),
  get: (id: number) => api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),
  create: (dto: CreatePODto) => api.post<PurchaseOrder>('/purchase-orders', dto).then((r) => r.data),
  update: (id: number, dto: UpdatePODto) =>
    api.patch<PurchaseOrder>(`/purchase-orders/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/purchase-orders/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/purchase-orders/${id}/restore`).then((r) => r.data),
}
