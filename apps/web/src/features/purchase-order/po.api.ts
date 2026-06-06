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
  orderId: number | null
  totalQuantity: number
  deliveryDate: string
  unitPrice: number | null
  subsidyPrice: number | null
  status: string
  style?: {
    id: number
    code: string
    name: string
    customer?: { id: number; name: string }
  }
  order?: { id: number; orderNumber: string } | null
  items?: {
    id: number
    colorId: number
    sizeId: number
    quantity: number
    color?: { id: number; code: string; name: string; hex: string | null }
    size?: { id: number; code: string; name: string; sortOrder: number }
  }[]
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
  orderId?: number | null
  totalQuantity: number
  deliveryDate: string
  unitPrice?: number | null
  subsidyPrice?: number | null
  status?: string
  items?: { colorId: number; sizeId: number; quantity: number }[]
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
