import api from '@/lib/axios'

export interface LinePayrollRow {
  lineId: number
  lineName: string
  factoryId: number
  factoryName: string
  workerCount: number
  totalQuantity: number
  totalMoney: number
  perWorkerMtd: number
  predictedMoney: number
  perWorkerPredicted: number
  activeDays: number
}

export interface SectionPayroll {
  workerCount: number
  totalQuantity: number
  totalMoney: number
  perWorkerMtd: number
  predictedMoney: number
  perWorkerPredicted: number
  activeDays: number
}

export interface FactorySectionPayrollRow {
  factoryId: number
  factoryName: string
  cutting: SectionPayroll
  finishing: SectionPayroll
}

export interface LinePayrollResult {
  month: string
  rows: LinePayrollRow[]
}

export interface SectionPayrollResult {
  month: string
  rows: FactorySectionPayrollRow[]
}

export interface PayrollParams {
  factoryId?: number
  month?: string // YYYY-MM
}

export const payrollApi = {
  getLines: (params?: PayrollParams) =>
    api.get<LinePayrollResult>('/payroll/lines', { params }).then((r) => r.data),
  getSections: (params?: PayrollParams) =>
    api.get<SectionPayrollResult>('/payroll/sections', { params }).then((r) => r.data),
}
