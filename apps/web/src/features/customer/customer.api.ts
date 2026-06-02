import api from '@/lib/axios'

export interface Customer {
  id: number
  code: string
  name: string
  country: string | null
  contactInfo: string | null
  createdAt: string
  deletedAt: string | null
}

export interface CustomerListResult {
  data: Customer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateCustomerDto = { code?: string; name: string; country?: string; contactInfo?: string }
export type UpdateCustomerDto = Partial<CreateCustomerDto>

export const customerApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<CustomerListResult>('/customers', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string }[]>('/customers/active').then((r) => r.data),
  get: (id: number) => api.get<Customer>(`/customers/${id}`).then((r) => r.data),
  create: (dto: CreateCustomerDto) => api.post<Customer>('/customers', dto).then((r) => r.data),
  update: (id: number, dto: UpdateCustomerDto) =>
    api.patch<Customer>(`/customers/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/customers/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/customers/${id}/restore`).then((r) => r.data),
}
