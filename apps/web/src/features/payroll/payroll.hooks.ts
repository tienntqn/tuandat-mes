import { useQuery } from '@tanstack/react-query'
import { payrollApi, type PayrollParams } from './payroll.api'

export const payrollKeys = {
  lines: (params?: object) => ['payroll', 'lines', params] as const,
  sections: (params?: object) => ['payroll', 'sections', params] as const,
}

export function useLinePayroll(params?: PayrollParams) {
  return useQuery({
    queryKey: payrollKeys.lines(params),
    queryFn: () => payrollApi.getLines(params),
  })
}

export function useSectionPayroll(params?: PayrollParams) {
  return useQuery({
    queryKey: payrollKeys.sections(params),
    queryFn: () => payrollApi.getSections(params),
  })
}
