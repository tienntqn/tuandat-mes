import api from '@/lib/axios'

// Các trường tiền/số lượng Prisma Decimal được serialize thành chuỗi (string) qua JSON.
export interface SalarySlip {
  id: number
  periodId: number
  employeeId: number | null
  employeeCode: string
  fullName: string
  department: string | null
  bankAccount: string | null
  email: string | null

  workDays: string
  otSundayNight: string
  otNormalHours: string
  totalWorkHours: string
  convertedWorkDays: string
  workCoefficient: string
  salaryRate: string
  otNormalPay: string
  performanceCoefficient: string
  salarySupport: string
  fuelAllowance: string
  attendanceBonus: string
  incentiveBonus: string
  holidayPay: string
  paidPersonalLeave: string
  leaveSupport: string
  leaveDays: string
  leavePay: string
  trainingDays: string
  menstrualHours: string
  womenSpecialPay: string
  totalSalary: string
  unemploymentInsurance: string
  socialInsurance: string
  otherDeduction: string
  advanceDeduction: string
  personalIncomeTax: string
  netSalary: string

  emailSentAt: string | null
  emailError: string | null
  employee?: { id: number; code: string; fullName: string } | null
}

export interface SalaryPeriod {
  id: number
  month: number
  year: number
  sourceFileName: string
  uploadedBy: number
  uploadedAt: string
  slipCount?: number
  sentCount?: number
  totalNetSalary?: string
  uploader?: { id: number; username: string }
  slips?: SalarySlip[]
}

export interface UploadSalaryPeriodResult {
  period: SalaryPeriod
  totalRows: number
  matched: number
  unmatched: number
}

export interface SendSalaryResult {
  sent: number
  failed: number
  errors: { slipId: number; employeeCode: string; error: string }[]
}

export const accountingApi = {
  listPeriods: () =>
    api.get<SalaryPeriod[]>('/accounting/salary-periods').then((r) => r.data),

  getPeriod: (id: number) =>
    api.get<SalaryPeriod>(`/accounting/salary-periods/${id}`).then((r) => r.data),

  uploadPeriod: (file: File, month: number, year: number) => {
    const form = new FormData()
    form.append('file', file)
    form.append('month', String(month))
    form.append('year', String(year))
    return api
      .post<UploadSalaryPeriodResult>('/accounting/salary-periods/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      })
      .then((r) => r.data)
  },

  sendEmails: (periodId: number, slipIds?: number[]) =>
    api
      .post<SendSalaryResult>(`/accounting/salary-periods/${periodId}/send`, { slipIds })
      .then((r) => r.data),

  deletePeriod: (id: number) =>
    api.delete(`/accounting/salary-periods/${id}`).then((r) => r.data),
}
