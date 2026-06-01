import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeApi, type EmployeeParams, type CreateEmployeeDto, type UpdateEmployeeDto } from './employee.api'
import { toast } from '@/lib/toast'

const KEY = 'employees'

export function useEmployees(params?: EmployeeParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => employeeApi.list(params) })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => employeeApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo nhân viên') },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateEmployeeDto }) => employeeApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật nhân viên') },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa nhân viên') },
  })
}

export function useRestoreEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => employeeApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã khôi phục nhân viên') },
  })
}
