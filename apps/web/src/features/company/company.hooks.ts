import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyApi, type UpdateCompanyDto } from './company.api'
import { toast } from '@/lib/toast'

export const COMPANY_KEY = ['company']

export function useCompany() {
  return useQuery({ queryKey: COMPANY_KEY, queryFn: companyApi.get })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateCompanyDto) => companyApi.update(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMPANY_KEY })
      toast.success('Đã cập nhật thông tin công ty')
    },
  })
}
