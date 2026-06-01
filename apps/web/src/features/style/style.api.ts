import api from '@/lib/axios'

export interface Style {
  id: number
  code: string
  name: string
  customerId: number
  season: string | null
  image: string | null
  description: string | null
  sam: string | null
  customer?: { id: number; code: string; name: string }
  createdAt: string
  deletedAt: string | null
}

export interface StyleListResult {
  data: Style[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateStyleDto = {
  code: string
  name: string
  customerId: number
  season?: string
  image?: string
  description?: string
  sam?: number
}
export type UpdateStyleDto = Partial<CreateStyleDto>

export const styleApi = {
  list: (params?: { search?: string; customerId?: number; page?: number; pageSize?: number }) =>
    api.get<StyleListResult>('/styles', { params }).then((r) => r.data),
  active: () =>
    api
      .get<{ id: number; code: string; name: string; customer: { id: number; name: string } }[]>(
        '/styles/active',
      )
      .then((r) => r.data),
  get: (id: number) => api.get<Style>(`/styles/${id}`).then((r) => r.data),
  create: (dto: CreateStyleDto) => api.post<Style>('/styles', dto).then((r) => r.data),
  update: (id: number, dto: UpdateStyleDto) =>
    api.patch<Style>(`/styles/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/styles/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/styles/${id}/restore`).then((r) => r.data),
}
