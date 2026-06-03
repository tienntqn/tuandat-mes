import api from '@/lib/axios'

export interface Size {
  id: number
  code: string
  name: string
  sortOrder: number
  createdAt: string
  deletedAt: string | null
}

export interface SizeListResult {
  data: Size[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateSizeDto = { code?: string; name: string; sortOrder?: number }
export type UpdateSizeDto = Partial<CreateSizeDto>

export const sizeApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<SizeListResult>('/sizes', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string; sortOrder: number }[]>('/sizes/active').then((r) => r.data),
  create: (dto: CreateSizeDto) => api.post<Size>('/sizes', dto).then((r) => r.data),
  update: (id: number, dto: UpdateSizeDto) => api.patch<Size>(`/sizes/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/sizes/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/sizes/${id}/restore`).then((r) => r.data),
}
