import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartonTypeApi, type CreateCartonTypeDto, type UpdateCartonTypeDto } from './carton-type.api'
import { toast } from '@/lib/toast'

const KEY = 'carton-types'

export function useCartonTypes(customerId: number | undefined) {
  return useQuery({
    queryKey: [KEY, customerId],
    queryFn: () => cartonTypeApi.listByCustomer(customerId!),
    enabled: !!customerId,
  })
}

export function useCreateCartonType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCartonTypeDto) => cartonTypeApi.create(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, data.customerId] })
      toast.success('Đã thêm loại thùng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể thêm loại thùng'),
  })
}

export function useUpdateCartonType(customerId: number | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCartonTypeDto }) => cartonTypeApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, customerId] })
      toast.success('Đã cập nhật loại thùng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể cập nhật'),
  })
}

export function useDeleteCartonType(customerId: number | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cartonTypeApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, customerId] })
      toast.success('Đã xóa loại thùng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể xóa'),
  })
}
