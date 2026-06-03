import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { colorApi, type CreateColorDto, type UpdateColorDto } from './color.api'
import { toast } from '@/lib/toast'

const KEY = 'colors'

export function useColors(params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => colorApi.list(params) })
}

export function useColorsActive() {
  return useQuery({ queryKey: [KEY, 'active'], queryFn: colorApi.active })
}

export function useCreateColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateColorDto) => colorApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo màu') },
  })
}

export function useUpdateColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateColorDto }) => colorApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật màu') },
  })
}

export function useDeleteColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => colorApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa màu') },
  })
}

export function useRestoreColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => colorApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục màu') },
  })
}
