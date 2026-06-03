import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sizeApi, type CreateSizeDto, type UpdateSizeDto } from './size.api'
import { toast } from '@/lib/toast'

const KEY = 'sizes'

export function useSizes(params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => sizeApi.list(params) })
}

export function useSizesActive() {
  return useQuery({ queryKey: [KEY, 'active'], queryFn: sizeApi.active })
}

export function useCreateSize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSizeDto) => sizeApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo size') },
  })
}

export function useUpdateSize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateSizeDto }) => sizeApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật size') },
  })
}

export function useDeleteSize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => sizeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa size') },
  })
}

export function useRestoreSize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => sizeApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục size') },
  })
}
