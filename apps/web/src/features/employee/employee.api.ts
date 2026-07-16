import api from '@/lib/axios'

export const POSITION_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  BOD: 'Ban Giám đốc',
  COMPANY_PLANNER: 'KH Công ty',
  FACTORY_DIRECTOR: 'GĐ Xưởng',
  FACTORY_PLANNER: 'KH Xưởng',
  LINE_LEADER: 'Tổ trưởng',
  LINE_DEPUTY: 'Tổ phó',
  MECHANIC: 'Cơ điện',
  CUTTING_LEADER: 'Tổ trưởng Cắt',
  FINISHING_LEADER: 'Tổ trưởng Hoàn thành',
  QC_LEADER: 'Tổ trưởng KCS',
  ACCOUNTANT: 'Kế toán',
}

export interface Employee {
  id: number
  code: string
  fullName: string
  phone: string | null
  email: string | null
  position: string
  factoryId: number | null
  lineId: number | null
  factory?: { id: number; code: string; name: string } | null
  line?: { id: number; lineNumber: number; name: string } | null
  user?: { id: number; username: string; isActive: boolean } | null
  createdAt: string
  deletedAt: string | null
}

export interface EmployeeListResult {
  data: Employee[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface EmployeeParams {
  search?: string
  factoryId?: number
  position?: string
  page?: number
  pageSize?: number
}

export type CreateEmployeeDto = {
  code?: string
  fullName: string
  phone?: string
  email?: string
  position: string
  factoryId?: number
  lineId?: number
}
export type UpdateEmployeeDto = Partial<CreateEmployeeDto>

export const employeeApi = {
  list: (params?: EmployeeParams) =>
    api.get<EmployeeListResult>('/employees', { params }).then((r) => r.data),
  get: (id: number) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (dto: CreateEmployeeDto) => api.post<Employee>('/employees', dto).then((r) => r.data),
  update: (id: number, dto: UpdateEmployeeDto) =>
    api.patch<Employee>(`/employees/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/employees/${id}`).then((r) => r.data),
  restore: (id: number) => api.patch(`/employees/${id}/restore`).then((r) => r.data),
}
