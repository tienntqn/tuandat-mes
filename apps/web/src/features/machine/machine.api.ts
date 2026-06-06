import api from '@/lib/axios'

export type MachineType = 'SEWING' | 'PROGRAMMABLE' | 'SEAM_SEALING' | 'CUTTING' | 'OTHER'
export type MachineStatus = 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BROKEN' | 'STOPPED'
export type MaintenanceType = 'PERIODIC' | 'REPAIR'
export type TransferStatus = 'PENDING' | 'SENDER_CONFIRMED' | 'COMPLETED' | 'REJECTED'

export interface MachineImage {
  id: number
  machineId: number
  url: string
  caption: string | null
}

export interface MachineLiquidation {
  id: number
  machineId: number
  liquidationDate: string
  reason: string
  decisionNo: string | null
  salvageValue: number | null
  approvedBy: string | null
  note: string | null
}

export interface Machine {
  id: number
  code: string
  name: string
  type: MachineType
  status: MachineStatus
  factoryId: number
  lineId: number | null
  brand: string | null
  brandId: number | null
  categoryId: number | null
  model: string | null
  serialNo: string | null
  manufactureYear: number | null
  purchaseDate: string | null
  warrantyExpiry: string | null
  note: string | null
  liquidatedAt: string | null
  factory?: { id: number; name: string; code: string }
  line?: { id: number; name: string; lineNumber: number } | null
  brandRef?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  images?: MachineImage[]
  liquidation?: MachineLiquidation | null
  maintenances?: MachineMaintenance[]
  transfers?: MachineTransfer[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface MachineMaintenance {
  id: number
  machineId: number
  maintenanceDate: string
  type: MaintenanceType
  description: string
  performedBy: string | null
  cost: number | null
  nextDueDate: string | null
  machine?: { id: number; code: string; name: string }
  createdAt: string
}

export interface MachineTransfer {
  id: number
  machineId: number
  transferOrderNo: string
  transferDate: string
  reason: string
  fromFactoryId: number
  toFactoryId: number
  senderId: number
  receiverId: number
  senderConfirmedAt: string | null
  receiverConfirmedAt: string | null
  status: TransferStatus
  rejectReason: string | null
  machine?: { id: number; code: string; name: string; type: MachineType }
  fromFactory?: { id: number; name: string }
  toFactory?: { id: number; name: string }
  sender?: { id: number; fullName: string }
  receiver?: { id: number; fullName: string }
  createdAt: string
}

export interface MachineListResult {
  data: Machine[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface MachineParams {
  factoryId?: number
  lineId?: number
  status?: MachineStatus | ''
  type?: MachineType | ''
  search?: string
  page?: number
  pageSize?: number
}

export interface MaintenanceListResult {
  data: MachineMaintenance[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TransferListResult {
  data: MachineTransfer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateMachineDto = {
  code?: string
  name: string
  type: MachineType
  factoryId: number
  lineId?: number | null
  status?: MachineStatus
  brand?: string
  brandId?: number
  categoryId?: number
  model?: string
  serialNo?: string
  manufactureYear?: number
  purchaseDate?: string
  warrantyExpiry?: string
  note?: string
  images?: { url: string; caption?: string }[]
}
export type UpdateMachineDto = Partial<CreateMachineDto>

export type LiquidateMachineDto = {
  liquidationDate: string
  reason: string
  decisionNo?: string
  salvageValue?: number
  approvedBy?: string
  note?: string
}

export type CreateMaintenanceDto = {
  machineId: number
  maintenanceDate: string
  type: MaintenanceType
  description: string
  performedBy?: string
  cost?: number
  nextDueDate?: string
}

export type CreateTransferDto = {
  machineId: number
  transferOrderNo?: string // tự sinh ở backend nếu bỏ trống
  transferDate: string
  reason: string
  fromFactoryId: number
  toFactoryId: number
  senderId: number
  receiverId: number
}

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  SEWING: 'Máy may',
  PROGRAMMABLE: 'Máy lập trình',
  SEAM_SEALING: 'Máy dán đường may',
  CUTTING: 'Máy cắt',
  OTHER: 'Khác',
}

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  RUNNING: 'Đang chạy',
  IDLE: 'Chờ',
  MAINTENANCE: 'Đang bảo dưỡng',
  BROKEN: 'Hỏng',
  STOPPED: 'Dừng',
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: 'Chờ duyệt',
  SENDER_CONFIRMED: 'Đã duyệt — chờ bên nhận',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Đã từ chối',
}

export const machineApi = {
  list: (params?: MachineParams) =>
    api.get<MachineListResult>('/machines', { params }).then((r) => r.data),
  get: (id: number) => api.get<Machine>(`/machines/${id}`).then((r) => r.data),
  create: (dto: CreateMachineDto) => api.post<Machine>('/machines', dto).then((r) => r.data),
  update: (id: number, dto: UpdateMachineDto) =>
    api.patch<Machine>(`/machines/${id}`, dto).then((r) => r.data),
  assignLine: (id: number, lineId: number | null) =>
    api.patch<Machine>(`/machines/${id}/assign-line`, { lineId }).then((r) => r.data),
  delete: (id: number) => api.delete(`/machines/${id}`).then((r) => r.data),
  maintenanceDue: (daysAhead?: number) =>
    api.get<Machine[]>('/machines/maintenance-due', { params: { daysAhead } }).then((r) => r.data),
  liquidate: (id: number, dto: LiquidateMachineDto) =>
    api.post(`/machines/${id}/liquidate`, dto).then((r) => r.data),
  listLiquidated: (params?: { page?: number; pageSize?: number }) =>
    api.get<MachineListResult>('/machines/liquidations', { params }).then((r) => r.data),
}

export const maintenanceApi = {
  list: (machineId: number, page?: number) =>
    api
      .get<MaintenanceListResult>('/machine-maintenances', { params: { machineId, page } })
      .then((r) => r.data),
  create: (dto: CreateMaintenanceDto) =>
    api.post<MachineMaintenance>('/machine-maintenances', dto).then((r) => r.data),
}

export interface TransferFormOptions {
  factories: { id: number; code: string; name: string }[]
  people: { id: number; fullName: string; position: string; factoryId: number }[]
}

export const transferApi = {
  list: (params?: { machineId?: number; status?: string; page?: number }) =>
    api.get<TransferListResult>('/machine-transfers', { params }).then((r) => r.data),
  formOptions: () =>
    api.get<TransferFormOptions>('/machine-transfers/form-options').then((r) => r.data),
  get: (id: number) => api.get<MachineTransfer>(`/machine-transfers/${id}`).then((r) => r.data),
  history: (machineId: number) =>
    api.get<MachineTransfer[]>(`/machine-transfers/machine/${machineId}/history`).then((r) => r.data),
  create: (dto: CreateTransferDto) =>
    api.post<MachineTransfer>('/machine-transfers', dto).then((r) => r.data),
  confirmSender: (id: number) =>
    api.patch<MachineTransfer>(`/machine-transfers/${id}/confirm-sender`).then((r) => r.data),
  confirmReceiver: (id: number) =>
    api.patch<MachineTransfer>(`/machine-transfers/${id}/confirm-receiver`).then((r) => r.data),
  reject: (id: number, rejectReason: string) =>
    api.patch<MachineTransfer>(`/machine-transfers/${id}/reject`, { rejectReason }).then((r) => r.data),
}
