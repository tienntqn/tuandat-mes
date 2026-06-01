import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { factoryApi, type FactoryParams, type CreateFactoryDto, type UpdateFactoryDto } from './factory.api'
import { toast } from '@/lib/toast'

const KEY = 'factories'

export function useFactories(params?: FactoryParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => factoryApi.list(params) })
}

export function useFactory(id: number) {
  return useQuery({ queryKey: [KEY, id], queryFn: () => factoryApi.get(id) })
}

export function useCreateFactory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFactoryDto) => factoryApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo xưởng') },
  })
}

export function useUpdateFactory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateFactoryDto }) => factoryApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật xưởng') },
  })
}

export function useDeleteFactory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => factoryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa xưởng') },
  })
}

export function useRestoreFactory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => factoryApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục xưởng') },
  })
}
