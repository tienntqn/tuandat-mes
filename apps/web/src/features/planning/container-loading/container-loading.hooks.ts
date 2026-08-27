import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { containerLoadingApi, type CreateContainerLoadingPlanDto } from './container-loading.api'
import { toast } from '@/lib/toast'

const KEY = 'container-loading-plans'

export function useContainerLoadingPlans(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => containerLoadingApi.list(params),
  })
}

export function useContainerLoadingPlan(id: number | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => containerLoadingApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateContainerLoadingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateContainerLoadingPlanDto) => containerLoadingApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Đã lưu kết quả xếp container vào lịch sử')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu lịch sử xếp container'),
  })
}

export function useDeleteContainerLoadingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => containerLoadingApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Đã xóa bản ghi lịch sử')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể xóa'),
  })
}
