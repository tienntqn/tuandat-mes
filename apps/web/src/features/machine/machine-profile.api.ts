import api from '@/lib/axios'

// ============================================================
// LÝ LỊCH MÁY · THỐNG KÊ HOẠT ĐỘNG · CẢNH BÁO CƠ ĐIỆN
// ============================================================

export type TimelineEventType =
  | 'HANDOVER' | 'BREAKDOWN' | 'INCIDENT' | 'WORK_ORDER'
  | 'MAINTENANCE_REQUEST' | 'TRANSFER' | 'STATUS' | 'CERTIFICATE' | 'LIQUIDATION'

export const TIMELINE_TYPE_LABELS: Record<TimelineEventType, string> = {
  HANDOVER: 'Bàn giao',
  BREAKDOWN: 'Báo hỏng',
  INCIDENT: 'Sự cố',
  WORK_ORDER: 'Sửa chữa / Bảo dưỡng',
  MAINTENANCE_REQUEST: 'Yêu cầu bảo dưỡng',
  TRANSFER: 'Điều chuyển',
  STATUS: 'Đổi trạng thái',
  CERTIFICATE: 'Chứng chỉ',
  LIQUIDATION: 'Thanh lý',
}

export const TIMELINE_TYPE_COLOR: Record<TimelineEventType, string> = {
  HANDOVER: '#6259ca',
  BREAKDOWN: '#dc3545',
  INCIDENT: '#fd7e14',
  WORK_ORDER: '#0dcaf0',
  MAINTENANCE_REQUEST: '#ffc107',
  TRANSFER: '#20c997',
  STATUS: '#6c757d',
  CERTIFICATE: '#198754',
  LIQUIDATION: '#343a40',
}

export interface TimelineEvent {
  type: TimelineEventType
  date: string
  title: string
  description?: string | null
  documentNo?: string | null
  status?: string | null
  refId: number
}

export interface MachineStatRow {
  machineId: number
  machineCode: string
  machineName: string
  status: string
  factory?: { id: number; name: string } | null
  line?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  breakdownCount: number
  stoppedProductionCount: number
  repairCount: number
  maintenanceCount: number
  downtimeHours: number
  repairCost: number
  maintenanceCost: number
  totalCost: number
}

export interface MachineStatistics {
  summary: {
    from: string
    to: string
    machineCount: number
    breakdownCount: number
    repairCount: number
    maintenanceCount: number
    downtimeHours: number
    totalCost: number
    topBreakdownMachines: MachineStatRow[]
  } | null
  rows: MachineStatRow[]
}

export interface MechanicAlerts {
  pendingBreakdowns: {
    id: number; reportNo: string; symptom: string; severity: string; status: string; reportedAt: string
    machine?: { id: number; code: string; name: string }
  }[]
  openWorkOrders: {
    id: number; orderNo: string; type: string; status: string; content: string
    machine?: { id: number; code: string; name: string }
  }[]
  overdueMaintenance: {
    machineId: number; machineCode: string; machineName: string
    line?: { id: number; name: string } | null
    dueDate: string; overdueDays: number
  }[]
  expiringCertificates: {
    id: number; name: string; certNo: string | null; expiryDate: string | null; daysLeft: number | null
    machine?: { id: number; code: string; name: string }
  }[]
  lowStocks: {
    sparePartId: number; code: string; name: string; unit: string | null
    quantity: number; minQuantity: number
  }[]
  pendingApprovals: {
    plans: { id: number; planNo: string; title: string; status: string; totalEstimatedCost: number | null }[]
    partRequests: { id: number; requestNo: string; title: string; status: string; totalAmount: number | null }[]
  }
}

export const machineProfileApi = {
  timeline: (machineId: number) =>
    api.get<TimelineEvent[]>(`/machine-profile/${machineId}/timeline`).then((r) => r.data),
  statistics: (params?: { fromDate?: string; toDate?: string; factoryId?: number }) =>
    api.get<MachineStatistics>('/machine-profile/statistics', { params }).then((r) => r.data),
  alerts: () => api.get<MechanicAlerts>('/machine-profile/alerts').then((r) => r.data),
}
