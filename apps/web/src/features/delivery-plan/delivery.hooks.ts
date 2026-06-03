import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deliveryApi, type CreateDeliveryPlanDto, type UpdateDeliveryPlanDto } from './delivery.api'
import { toast } from '@/lib/toast'

const KEY = 'delivery-plans'

export function useDeliveryPlans(params?: { poId?: number; status?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => deliveryApi.list(params) })
}

export function useCreateDeliveryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateDeliveryPlanDto) => deliveryApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo kế hoạch giao hàng') },
  })
}

export function useUpdateDeliveryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateDeliveryPlanDto }) => deliveryApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật kế hoạch giao hàng') },
  })
}

export function useDeleteDeliveryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deliveryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa kế hoạch giao hàng') },
  })
}

export function useRestoreDeliveryPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deliveryApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục kế hoạch giao hàng') },
  })
}
