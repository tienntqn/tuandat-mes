import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { poApi, type CreatePODto, type UpdatePODto } from './po.api'
import { toast } from '@/lib/toast'

const KEY = 'purchase-orders'

export function usePurchaseOrders(params?: { search?: string; styleId?: number; status?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => poApi.list(params) })
}

export function useCreatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePODto) => poApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo PO') },
  })
}

export function useUpdatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePODto }) => poApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật PO') },
  })
}

export function useDeletePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => poApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa PO') },
  })
}

export function useRestorePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => poApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục PO') },
  })
}
