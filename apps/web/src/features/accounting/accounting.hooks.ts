import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from './accounting.api'
import { toast } from '@/lib/toast'

const KEY = 'salary-periods'

export function useSalaryPeriods() {
  return useQuery({ queryKey: [KEY], queryFn: () => accountingApi.listPeriods() })
}

export function useSalaryPeriod(id: number | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => accountingApi.getPeriod(id as number),
    enabled: id != null,
  })
}

export function useUploadSalaryPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, month, year }: { file: File; month: number; year: number }) =>
      accountingApi.uploadPeriod(file, month, year),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success(
        `Đã đọc ${result.totalRows} dòng — khớp ${result.matched} nhân viên` +
          (result.unmatched > 0 ? `, ${result.unmatched} dòng không khớp` : ''),
      )
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không đọc được file bảng lương'),
  })
}

export function useSendSalaryEmails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ periodId, slipIds }: { periodId: number; slipIds?: number[] }) =>
      accountingApi.sendEmails(periodId, slipIds),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.periodId] })
      qc.invalidateQueries({ queryKey: [KEY] })
      if (result.failed === 0) {
        toast.success(`Đã gửi email thành công cho ${result.sent} nhân viên`)
      } else {
        toast.error(`Gửi thành công ${result.sent}, thất bại ${result.failed} (xem chi tiết trong bảng)`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể gửi email'),
  })
}

export function useDeleteSalaryPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => accountingApi.deletePeriod(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xoá kỳ lương') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể xoá kỳ lương'),
  })
}
