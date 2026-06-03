import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderApi, type CreateOrderDto, type UpdateOrderDto } from './order.api'
import { toast } from '@/lib/toast'

const KEY = 'orders'

export function useOrders(params?: { search?: string; customerId?: number; status?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => orderApi.list(params) })
}

export function useOrdersActive() {
  return useQuery({ queryKey: [KEY, 'active'], queryFn: orderApi.active })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => orderApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo đơn hàng') },
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateOrderDto }) => orderApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật đơn hàng') },
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orderApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa đơn hàng') },
  })
}

export function useRestoreOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orderApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục đơn hàng') },
  })
}
