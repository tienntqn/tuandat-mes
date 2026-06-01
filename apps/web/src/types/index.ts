// Enums khớp với Prisma schema
export enum FactoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum MachineType {
  SEWING = 'SEWING',
  PROGRAMMABLE = 'PROGRAMMABLE',
  SEAM_SEALING = 'SEAM_SEALING',
  CUTTING = 'CUTTING',
  OTHER = 'OTHER',
}

export enum MachineStatus {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  STOPPED = 'STOPPED',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  SENDER_CONFIRMED = 'SENDER_CONFIRMED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum ProductionStage {
  CUTTING = 'CUTTING',
  SEWING = 'SEWING',
  QC = 'QC',
  PACKING = 'PACKING',
}

export enum EmployeePosition {
  COMPANY_PLANNER = 'COMPANY_PLANNER',
  BOD = 'BOD',
  ADMIN = 'ADMIN',
  FACTORY_DIRECTOR = 'FACTORY_DIRECTOR',
  FACTORY_PLANNER = 'FACTORY_PLANNER',
  LINE_LEADER = 'LINE_LEADER',
  LINE_DEPUTY = 'LINE_DEPUTY',
  MECHANIC = 'MECHANIC',
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
}

// Kiểu chung cho API response
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}
