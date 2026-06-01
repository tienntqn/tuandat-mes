import api from '@/lib/axios'

export interface Factory {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  status: 'ACTIVE' | 'INACTIVE'
  companyId: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface FactoryListResult {
  data: Factory[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FactoryParams {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export type CreateFactoryDto = Pick<Factory, 'code' | 'name'> & Partial<Pick<Factory, 'address' | 'phone' | 'status'>>
export type UpdateFactoryDto = Partial<CreateFactoryDto>

export const factoryApi = {
  list: (params?: FactoryParams) =>
    api.get<FactoryListResult>('/factories', { params }).then((r) => r.data),
  get: (id: number) => api.get<Factory>(`/factories/${id}`).then((r) => r.data),
  create: (dto: CreateFactoryDto) => api.post<Factory>('/factories', dto).then((r) => r.data),
  update: (id: number, dto: UpdateFactoryDto) =>
    api.patch<Factory>(`/factories/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/factories/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/factories/${id}/restore`).then((r) => r.data),
}
