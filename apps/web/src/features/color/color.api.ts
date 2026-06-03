import api from '@/lib/axios'

export interface Color {
  id: number
  code: string
  name: string
  hex: string | null
  createdAt: string
  deletedAt: string | null
}

export interface ColorListResult {
  data: Color[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateColorDto = { code?: string; name: string; hex?: string }
export type UpdateColorDto = Partial<CreateColorDto>

export const colorApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<ColorListResult>('/colors', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string; hex: string | null }[]>('/colors/active').then((r) => r.data),
  create: (dto: CreateColorDto) => api.post<Color>('/colors', dto).then((r) => r.data),
  update: (id: number, dto: UpdateColorDto) => api.patch<Color>(`/colors/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/colors/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/colors/${id}/restore`).then((r) => r.data),
}
