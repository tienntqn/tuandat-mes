import api from '@/lib/axios'

export interface ProductionLine {
  id: number
  factoryId: number
  lineNumber: number
  name: string
  capacity: number
  status: 'ACTIVE' | 'INACTIVE'
  factory?: { id: number; code: string; name: string }
  createdAt: string
  deletedAt: string | null
}

export interface LineListResult {
  data: ProductionLine[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LineParams {
  factoryId?: number
  search?: string
  page?: number
  pageSize?: number
}

export type CreateLineDto = { factoryId: number; lineNumber: number; name: string; capacity?: number; status?: string }
export type UpdateLineDto = Partial<CreateLineDto>

export const lineApi = {
  list: (params?: LineParams) =>
    api.get<LineListResult>('/production-lines', { params }).then((r) => r.data),
  byFactory: (factoryId: number) =>
    api.get<ProductionLine[]>(`/production-lines/by-factory/${factoryId}`).then((r) => r.data),
  get: (id: number) => api.get<ProductionLine>(`/production-lines/${id}`).then((r) => r.data),
  create: (dto: CreateLineDto) =>
    api.post<ProductionLine>('/production-lines', dto).then((r) => r.data),
  update: (id: number, dto: UpdateLineDto) =>
    api.patch<ProductionLine>(`/production-lines/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/production-lines/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/production-lines/${id}/restore`).then((r) => r.data),
}
