import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi, type CreateCustomerDto, type UpdateCustomerDto } from './customer.api'
import { toast } from '@/lib/toast'

const KEY = 'customers'

export function useCustomers(params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => customerApi.list(params) })
}

export function useCustomersActive() {
  return useQuery({ queryKey: [KEY, 'active'], queryFn: customerApi.active })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCustomerDto) => customerApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo khách hàng') },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCustomerDto }) => customerApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật khách hàng') },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customerApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa khách hàng') },
  })
}

export function useRestoreCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customerApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục khách hàng') },
  })
}
