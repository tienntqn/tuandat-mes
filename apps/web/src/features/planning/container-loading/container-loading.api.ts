import api from '@/lib/axios'
import type { PackingSummary, CartonInput } from './container-loading.types'

export interface ContainerLoadingPlanSummary {
  id: number
  name: string | null
  containerTypeCode: string
  containerLength: number
  containerWidth: number
  containerHeight: number
  containersUsed: number
  overallUtilization: number
  createdBy: number | null
  createdByName: string | null
  createdAt: string
}

export interface ContainerLoadingPlanDetail extends ContainerLoadingPlanSummary {
  cartons: CartonInput[]
  result: PackingSummary
  updatedAt: string
  deletedAt: string | null
}

export interface ContainerLoadingListResult {
  data: ContainerLoadingPlanSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateContainerLoadingPlanDto = {
  name?: string
  containerTypeCode: string
  containerLength: number
  containerWidth: number
  containerHeight: number
  cartons: CartonInput[]
  result: PackingSummary
  containersUsed: number
  overallUtilization: number
}

export const containerLoadingApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api.get<ContainerLoadingListResult>('/plan/container-loading', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<ContainerLoadingPlanDetail>(`/plan/container-loading/${id}`).then((r) => r.data),

  create: (dto: CreateContainerLoadingPlanDto) =>
    api.post<ContainerLoadingPlanDetail>('/plan/container-loading', dto).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/plan/container-loading/${id}`).then((r) => r.data),
}
