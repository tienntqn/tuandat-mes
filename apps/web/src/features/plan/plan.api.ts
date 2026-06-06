import api from '@/lib/axios'

// ============================================================
// TYPES
// ============================================================

export interface CompanyPlan {
  id: number
  styleId: number
  poId: number
  factoryId: number
  plannedQuantity: number
  startDate: string
  expectedFinishDate: string
  style?: { id: number; code: string; name: string; sam: number | null }
  po?: { id: number; poNumber: string; totalQuantity: number; deliveryDate: string }
  factory?: { id: number; code: string; name: string }
  factoryPlans?: FactoryPlan[]
  // Tính toán từ server
  allocatedToLines?: number
  remainingForLines?: number
  createdAt: string
  updatedAt: string
}

export interface FactoryPlan {
  id: number
  companyPlanId: number
  lineId: number
  plannedQuantity: number
  expectedFinishDate: string
  lineUnitPrice?: number | null
  companyPlan?: CompanyPlan
  line?: { id: number; name: string; lineNumber: number; factoryId: number }
  createdAt: string
  updatedAt: string
}

export interface POAllocationSummary {
  po: { id: number; poNumber: string; totalQuantity: number; deliveryDate: string; style: { id: number; code: string; name: string } }
  totalQuantity: number
  totalAllocated: number
  remaining: number
  plans: (CompanyPlan & { allocatedToLines: number })[]
}

export interface CompanyPlanProgress {
  companyPlan: CompanyPlan & { allocatedToLines: number; remainingForLines: number }
  factoryPlans: FactoryPlan[]
}

export interface PlanListResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================================
// DTOs
// ============================================================

export type CreateCompanyPlanDto = {
  styleId: number
  poId: number
  factoryId: number
  plannedQuantity: number
  startDate: string
  expectedFinishDate: string
}

export type UpdateCompanyPlanDto = Partial<CreateCompanyPlanDto>

export type BulkCreateCompanyPlanDto = { plans: CreateCompanyPlanDto[] }

export type CreateFactoryPlanDto = {
  companyPlanId: number
  lineId: number
  plannedQuantity: number
  expectedFinishDate: string
  unitPrice?: number | null
}

export type UpdateFactoryPlanDto = Partial<Pick<CreateFactoryPlanDto, 'plannedQuantity' | 'expectedFinishDate' | 'unitPrice'>>

export type BulkCreateFactoryPlanDto = { plans: CreateFactoryPlanDto[] }

// ============================================================
// QUERY PARAMS
// ============================================================

export type CompanyPlanParams = {
  styleId?: number
  poId?: number
  factoryId?: number
  page?: number
  pageSize?: number
}

export type FactoryPlanParams = {
  companyPlanId?: number
  lineId?: number
  factoryId?: number
  page?: number
  pageSize?: number
}

// ============================================================
// API CALLS
// ============================================================

export const companyPlanApi = {
  list: (params?: CompanyPlanParams) =>
    api.get<PlanListResult<CompanyPlan>>('/company-plans', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<CompanyPlan>(`/company-plans/${id}`).then((r) => r.data),

  poSummary: (poId: number) =>
    api.get<POAllocationSummary>(`/company-plans/po-summary/${poId}`).then((r) => r.data),

  create: (dto: CreateCompanyPlanDto) =>
    api.post<CompanyPlan>('/company-plans', dto).then((r) => r.data),

  bulkCreate: (dto: BulkCreateCompanyPlanDto) =>
    api.post<CompanyPlan[]>('/company-plans/bulk', dto).then((r) => r.data),

  update: (id: number, dto: UpdateCompanyPlanDto) =>
    api.patch<CompanyPlan>(`/company-plans/${id}`, dto).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/company-plans/${id}`).then((r) => r.data),
}

export const factoryPlanApi = {
  list: (params?: FactoryPlanParams) =>
    api.get<PlanListResult<FactoryPlan>>('/factory-plans', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<FactoryPlan>(`/factory-plans/${id}`).then((r) => r.data),

  progress: (companyPlanId: number) =>
    api.get<CompanyPlanProgress>(`/factory-plans/company-plan-progress/${companyPlanId}`).then((r) => r.data),

  create: (dto: CreateFactoryPlanDto) =>
    api.post<FactoryPlan>('/factory-plans', dto).then((r) => r.data),

  bulkCreate: (dto: BulkCreateFactoryPlanDto) =>
    api.post<FactoryPlan[]>('/factory-plans/bulk', dto).then((r) => r.data),

  update: (id: number, dto: UpdateFactoryPlanDto) =>
    api.patch<FactoryPlan>(`/factory-plans/${id}`, dto).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/factory-plans/${id}`).then((r) => r.data),
}
