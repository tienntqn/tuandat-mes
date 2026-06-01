import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { styleApi, type CreateStyleDto, type UpdateStyleDto } from './style.api'
import { toast } from '@/lib/toast'

const KEY = 'styles'

export function useStyles(params?: { search?: string; customerId?: number; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => styleApi.list(params) })
}

export function useStylesActive() {
  return useQuery({ queryKey: [KEY, 'active'], queryFn: styleApi.active })
}

export function useCreateStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateStyleDto) => styleApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo mã hàng') },
  })
}

export function useUpdateStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateStyleDto }) => styleApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật mã hàng') },
  })
}

export function useDeleteStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => styleApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa mã hàng') },
  })
}

export function useRestoreStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => styleApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục mã hàng') },
  })
}
