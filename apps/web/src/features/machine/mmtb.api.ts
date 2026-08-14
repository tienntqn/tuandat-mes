import api from '@/lib/axios'
import type { ListResult } from './catalog.api'

// ============================================================
// PHÂN HỆ MÁY MÓC THIẾT BỊ — KHỐI KHAI BÁO
// Biên bản bàn giao · Chứng chỉ/kiểm định · Tài liệu · Định mức bảo dưỡng
// ============================================================

export type HandoverType = 'RECEIVE' | 'AFTER_REPAIR' | 'AFTER_MAINTENANCE'
export type HandoverStatus = 'DRAFT' | 'PENDING_RECEIVER' | 'COMPLETED' | 'REJECTED'
export type CertificateType = 'INSPECTION' | 'CALIBRATION' | 'QUALITY' | 'OTHER'
export type MachineDocumentType =
  | 'MANUAL' | 'INVOICE' | 'CONTRACT' | 'CERTIFICATE' | 'DRAWING' | 'IMAGE' | 'OTHER'

export const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  RECEIVE: 'Bàn giao nhận máy',
  AFTER_REPAIR: 'Bàn giao sau sửa chữa',
  AFTER_MAINTENANCE: 'Bàn giao sau bảo dưỡng',
}

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_RECEIVER: 'Chờ bên nhận xác nhận',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Đã từ chối',
}

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  INSPECTION: 'Kiểm định an toàn',
  CALIBRATION: 'Hiệu chuẩn',
  QUALITY: 'Chứng nhận chất lượng',
  OTHER: 'Khác',
}

export const DOCUMENT_TYPE_LABELS: Record<MachineDocumentType, string> = {
  MANUAL: 'Hướng dẫn sử dụng',
  INVOICE: 'Hóa đơn / chứng từ mua',
  CONTRACT: 'Hợp đồng',
  CERTIFICATE: 'Chứng chỉ',
  DRAWING: 'Bản vẽ kỹ thuật',
  IMAGE: 'Hình ảnh',
  OTHER: 'Khác',
}

// ===== Biên bản bàn giao =====

export interface MachineHandover {
  id: number
  handoverNo: string
  type: HandoverType
  machineId: number
  factoryId: number
  lineId: number | null
  workOrderId: number | null
  handoverDate: string
  fromParty: string | null
  senderId: number | null
  receiverId: number | null
  condition: string | null
  accessories: string | null
  note: string | null
  status: HandoverStatus
  senderConfirmedAt: string | null
  receiverConfirmedAt: string | null
  rejectReason: string | null
  createdAt: string
  machine?: {
    id: number; code: string; name: string; model: string | null; serialNo: string | null
    brandRef?: { id: number; name: string } | null
    category?: { id: number; name: string } | null
  }
  factory?: { id: number; code: string; name: string }
  line?: { id: number; name: string; lineNumber: number } | null
  workOrder?: { id: number; orderNo: string; type: string; content: string; result: string | null } | null
}

export type CreateHandoverDto = {
  type: HandoverType
  machineId: number
  lineId?: number
  workOrderId?: number
  handoverDate: string
  fromParty?: string
  senderId?: number
  receiverId?: number
  condition?: string
  accessories?: string
  note?: string
}

export const handoverApi = {
  list: (params?: { type?: string; status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<MachineHandover>>('/machine-handovers', { params }).then((r) => r.data),
  get: (id: number) => api.get<MachineHandover>(`/machine-handovers/${id}`).then((r) => r.data),
  create: (dto: CreateHandoverDto) => api.post<MachineHandover>('/machine-handovers', dto).then((r) => r.data),
  update: (id: number, dto: Partial<Omit<CreateHandoverDto, 'machineId' | 'type'>>) =>
    api.patch<MachineHandover>(`/machine-handovers/${id}`, dto).then((r) => r.data),
  confirmSender: (id: number) =>
    api.post<MachineHandover>(`/machine-handovers/${id}/confirm-sender`).then((r) => r.data),
  confirmReceiver: (id: number) =>
    api.post<MachineHandover>(`/machine-handovers/${id}/confirm-receiver`).then((r) => r.data),
  reject: (id: number, rejectReason: string) =>
    api.post<MachineHandover>(`/machine-handovers/${id}/reject`, { rejectReason }).then((r) => r.data),
  delete: (id: number) => api.delete(`/machine-handovers/${id}`).then((r) => r.data),
}

// ===== Chứng chỉ / kiểm định =====

export interface MachineCertificate {
  id: number
  machineId: number
  type: CertificateType
  certNo: string | null
  name: string
  issuedBy: string | null
  issueDate: string | null
  expiryDate: string | null
  fileUrl: string | null
  note: string | null
  machine?: { id: number; code: string; name: string; factory?: { id: number; name: string } }
}

export type CreateCertificateDto = {
  machineId: number
  type?: CertificateType
  certNo?: string
  name: string
  issuedBy?: string
  issueDate?: string
  expiryDate?: string
  fileUrl?: string
  note?: string
}

export const certificateApi = {
  list: (params?: { machineId?: number; expiringInDays?: number }) =>
    api.get<MachineCertificate[]>('/machine-certificates', { params }).then((r) => r.data),
  get: (id: number) => api.get<MachineCertificate>(`/machine-certificates/${id}`).then((r) => r.data),
  create: (dto: CreateCertificateDto) => api.post<MachineCertificate>('/machine-certificates', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateCertificateDto>) =>
    api.patch<MachineCertificate>(`/machine-certificates/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/machine-certificates/${id}`).then((r) => r.data),
}

// ===== Tài liệu hồ sơ máy =====

export interface MachineDocument {
  id: number
  machineId: number
  type: MachineDocumentType
  name: string
  url: string
  filename: string | null
  note: string | null
  createdAt: string
}

export type CreateMachineDocumentDto = {
  machineId: number
  type?: MachineDocumentType
  name: string
  url: string
  filename?: string
  note?: string
}

export const machineDocumentApi = {
  list: (machineId: number, type?: string) =>
    api.get<MachineDocument[]>('/machine-documents', { params: { machineId, type } }).then((r) => r.data),
  create: (dto: CreateMachineDocumentDto) =>
    api.post<MachineDocument>('/machine-documents', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateMachineDocumentDto>) =>
    api.patch<MachineDocument>(`/machine-documents/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/machine-documents/${id}`).then((r) => r.data),
}

// ===== Định mức bảo dưỡng =====

export interface MaintenanceNormItem {
  id: number
  normId: number
  sparePartId: number | null
  name: string
  unit: string | null
  quantity: number
  note: string | null
  sparePart?: { id: number; code: string; name: string; unit?: string | null } | null
}

export interface MaintenanceNorm {
  id: number
  code: string
  name: string
  categoryId: number | null
  machineId: number | null
  intervalDays: number
  estimatedHours: number | null
  estimatedCost: number | null
  checklist: string | null
  description: string | null
  isActive: boolean
  category?: { id: number; code: string; name: string } | null
  machine?: { id: number; code: string; name: string } | null
  items?: MaintenanceNormItem[]
}

export type NormItemInput = {
  sparePartId?: number
  name: string
  unit?: string
  quantity: number
  note?: string
}

export type CreateMaintenanceNormDto = {
  code?: string
  name: string
  categoryId?: number
  machineId?: number
  intervalDays: number
  estimatedHours?: number
  estimatedCost?: number
  checklist?: string
  description?: string
  isActive?: boolean
  items?: NormItemInput[]
}

export const maintenanceNormApi = {
  list: (params?: { categoryId?: number; machineId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<MaintenanceNorm>>('/maintenance-norms', { params }).then((r) => r.data),
  get: (id: number) => api.get<MaintenanceNorm>(`/maintenance-norms/${id}`).then((r) => r.data),
  forMachine: (machineId: number) =>
    api.get<MaintenanceNorm | null>(`/maintenance-norms/for-machine/${machineId}`).then((r) => r.data),
  create: (dto: CreateMaintenanceNormDto) =>
    api.post<MaintenanceNorm>('/maintenance-norms', dto).then((r) => r.data),
  update: (id: number, dto: Partial<CreateMaintenanceNormDto>) =>
    api.patch<MaintenanceNorm>(`/maintenance-norms/${id}`, dto).then((r) => r.data),
  delete: (id: number) => api.delete(`/maintenance-norms/${id}`).then((r) => r.data),
}
