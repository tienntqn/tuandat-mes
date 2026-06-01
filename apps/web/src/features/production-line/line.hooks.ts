import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lineApi, type LineParams, type CreateLineDto, type UpdateLineDto } from './line.api'
import { toast } from '@/lib/toast'

const KEY = 'production-lines'

export function useLines(params?: LineParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => lineApi.list(params) })
}

export function useLinesByFactory(factoryId: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'by-factory', factoryId],
    queryFn: () => lineApi.byFactory(factoryId!),
    enabled: !!factoryId,
  })
}

export function useCreateLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLineDto) => lineApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo chuyền') },
  })
}

export function useUpdateLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateLineDto }) => lineApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật chuyền') },
  })
}

export function useDeleteLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => lineApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa chuyền') },
  })
}

export function useRestoreLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => lineApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục chuyền') },
  })
}
