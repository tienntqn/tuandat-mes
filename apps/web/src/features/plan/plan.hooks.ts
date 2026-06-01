import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  companyPlanApi, factoryPlanApi,
  type CompanyPlanParams, type FactoryPlanParams,
  type CreateCompanyPlanDto, type UpdateCompanyPlanDto, type BulkCreateCompanyPlanDto,
  type CreateFactoryPlanDto, type UpdateFactoryPlanDto, type BulkCreateFactoryPlanDto,
} from './plan.api'
import { toast } from '@/lib/toast'

const CP_KEY = 'company-plans'
const FP_KEY = 'factory-plans'

// ============================================================
// COMPANY PLAN HOOKS
// ============================================================

export function useCompanyPlans(params?: CompanyPlanParams) {
  return useQuery({
    queryKey: [CP_KEY, params],
    queryFn: () => companyPlanApi.list(params),
  })
}

export function useCompanyPlan(id: number) {
  return useQuery({
    queryKey: [CP_KEY, id],
    queryFn: () => companyPlanApi.get(id),
    enabled: !!id,
  })
}

export function usePOAllocationSummary(poId: number | undefined) {
  return useQuery({
    queryKey: [CP_KEY, 'po-summary', poId],
    queryFn: () => companyPlanApi.poSummary(poId!),
    enabled: !!poId,
  })
}

export function useCreateCompanyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCompanyPlanDto) => companyPlanApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã tạo kế hoạch công ty')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi tạo kế hoạch'),
  })
}

export function useBulkCreateCompanyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: BulkCreateCompanyPlanDto) => companyPlanApi.bulkCreate(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success(`Đã tạo ${data.length} kế hoạch công ty`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi tạo kế hoạch'),
  })
}

export function useUpdateCompanyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCompanyPlanDto }) =>
      companyPlanApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã cập nhật kế hoạch công ty')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi cập nhật'),
  })
}

export function useDeleteCompanyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => companyPlanApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã xóa kế hoạch')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể xóa'),
  })
}

// ============================================================
// FACTORY PLAN HOOKS
// ============================================================

export function useFactoryPlans(params?: FactoryPlanParams) {
  return useQuery({
    queryKey: [FP_KEY, params],
    queryFn: () => factoryPlanApi.list(params),
  })
}

export function useCompanyPlanProgress(companyPlanId: number | undefined) {
  return useQuery({
    queryKey: [FP_KEY, 'progress', companyPlanId],
    queryFn: () => factoryPlanApi.progress(companyPlanId!),
    enabled: !!companyPlanId,
  })
}

export function useCreateFactoryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFactoryPlanDto) => factoryPlanApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FP_KEY] })
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã phân bổ kế hoạch cho chuyền')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi phân bổ'),
  })
}

export function useBulkCreateFactoryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: BulkCreateFactoryPlanDto) => factoryPlanApi.bulkCreate(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [FP_KEY] })
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success(`Đã phân bổ ${data.length} chuyền`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi phân bổ'),
  })
}

export function useUpdateFactoryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateFactoryPlanDto }) =>
      factoryPlanApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FP_KEY] })
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã cập nhật kế hoạch xưởng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi cập nhật'),
  })
}

export function useDeleteFactoryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => factoryPlanApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FP_KEY] })
      qc.invalidateQueries({ queryKey: [CP_KEY] })
      toast.success('Đã xóa kế hoạch xưởng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể xóa'),
  })
}
