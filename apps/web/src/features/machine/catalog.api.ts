import api from '@/lib/axios'

export interface ListResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ===== Hãng sản xuất =====
export interface MachineBrand {
  id: number
  code: string
  name: string
  country: string | null
  note: string | null
  deletedAt: string | null
}
export type CreateBrandDto = { code?: string; name: string; country?: string; note?: string }

export const brandApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<MachineBrand>>('/machine-brands', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string }[]>('/machine-brands/active').then((r) => r.data),
  create: (dto: CreateBrandDto) => api.post<MachineBrand>('/machine-brands', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateBrandDto>) => api.patch<MachineBrand>(`/machine-brands/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/machine-brands/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/machine-brands/${id}/restore`).then((r) => r.data),
}

// ===== Chủng loại =====
export interface MachineCategory {
  id: number
  code: string
  name: string
  description: string | null
  deletedAt: string | null
}
export type CreateCategoryDto = { code?: string; name: string; description?: string }

export const categoryApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<MachineCategory>>('/machine-categories', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string }[]>('/machine-categories/active').then((r) => r.data),
  create: (dto: CreateCategoryDto) => api.post<MachineCategory>('/machine-categories', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateCategoryDto>) => api.patch<MachineCategory>(`/machine-categories/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/machine-categories/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/machine-categories/${id}/restore`).then((r) => r.data),
}

// ===== Phụ tùng =====
export interface SparePart {
  id: number
  code: string
  name: string
  unit: string | null
  categoryId: number | null
  note: string | null
  category?: { id: number; name: string } | null
  deletedAt: string | null
}
export type CreateSparePartDto = { code?: string; name: string; unit?: string; categoryId?: number; note?: string }

export const sparePartApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<SparePart>>('/spare-parts', { params }).then((r) => r.data),
  active: () =>
    api.get<{ id: number; code: string; name: string; unit: string | null }[]>('/spare-parts/active').then((r) => r.data),
  create: (dto: CreateSparePartDto) => api.post<SparePart>('/spare-parts', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateSparePartDto>) => api.patch<SparePart>(`/spare-parts/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/spare-parts/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/spare-parts/${id}/restore`).then((r) => r.data),
}
