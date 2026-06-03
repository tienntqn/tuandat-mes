import api from '@/lib/axios'

export const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang sản xuất',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy',
}

export interface Order {
  id: number
  orderNumber: string
  customerId: number
  orderDate: string
  deliveryDate: string | null
  status: string
  note: string | null
  customer?: { id: number; code: string; name: string }
  _count?: { purchaseOrders: number }
  createdAt: string
  deletedAt: string | null
}

export interface OrderListResult {
  data: Order[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateOrderDto = {
  orderNumber?: string
  customerId: number
  orderDate: string
  deliveryDate?: string
  status?: string
  note?: string
}
export type UpdateOrderDto = Partial<CreateOrderDto>

export const orderApi = {
  list: (params?: { search?: string; customerId?: number; status?: string; page?: number; pageSize?: number }) =>
    api.get<OrderListResult>('/orders', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; orderNumber: string; customerId: number }[]>('/orders/active').then((r) => r.data),
  get: (id: number) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (dto: CreateOrderDto) => api.post<Order>('/orders', dto).then((r) => r.data),
  update: (id: number, dto: UpdateOrderDto) =>
    api.patch<Order>(`/orders/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/orders/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/orders/${id}/restore`).then((r) => r.data),
}
