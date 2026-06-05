import api from '@/lib/axios'
import type { ListResult } from './catalog.api'

export type RepairProposalType = 'REPAIR' | 'REPLACEMENT'
export type RepairProposalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE'
export type AttachmentType = 'IMAGE' | 'VIDEO'

export const REPAIR_TYPE_LABELS: Record<RepairProposalType, string> = {
  REPAIR: 'Sửa chữa',
  REPLACEMENT: 'Thay thế',
}

export const REPAIR_STATUS_LABELS: Record<RepairProposalStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  DONE: 'Hoàn thành',
}

export interface RepairProposalItem {
  id: number
  proposalId: number
  sparePartId: number | null
  name: string
  quantity: number
  unit: string | null
  note: string | null
  sparePart?: { id: number; code: string; name: string } | null
}

export interface RepairProposalAttachment {
  id: number
  proposalId: number
  type: AttachmentType
  url: string
  filename: string | null
}

export interface RepairProposal {
  id: number
  proposalNo: string
  machineId: number
  factoryId: number
  type: RepairProposalType
  status: RepairProposalStatus
  title: string
  description: string | null
  estimatedCost: number | null
  requestedBy: number
  approvedBy: number | null
  approvedAt: string | null
  rejectReason: string | null
  completedAt: string | null
  createdAt: string
  machine?: { id: number; code: string; name: string }
  factory?: { id: number; name: string }
  items?: RepairProposalItem[]
  attachments?: RepairProposalAttachment[]
}

export type CreateRepairProposalDto = {
  machineId: number
  type: RepairProposalType
  title: string
  description?: string
  estimatedCost?: number
  items?: { sparePartId?: number; name: string; quantity: number; unit?: string; note?: string }[]
  attachments?: { type: AttachmentType; url: string; filename?: string }[]
}
export type UpdateRepairProposalDto = Partial<CreateRepairProposalDto>

export const repairApi = {
  list: (params?: { machineId?: number; status?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<RepairProposal>>('/repair-proposals', { params }).then((r) => r.data),
  get: (id: number) => api.get<RepairProposal>(`/repair-proposals/${id}`).then((r) => r.data),
  create: (dto: CreateRepairProposalDto) => api.post<RepairProposal>('/repair-proposals', dto).then((r) => r.data),
  update: (id: number, dto: UpdateRepairProposalDto) => api.patch<RepairProposal>(`/repair-proposals/${id}`, dto).then((r) => r.data),
  submit: (id: number) => api.patch<RepairProposal>(`/repair-proposals/${id}/submit`).then((r) => r.data),
  approve: (id: number) => api.patch<RepairProposal>(`/repair-proposals/${id}/approve`).then((r) => r.data),
  reject: (id: number, rejectReason: string) => api.patch<RepairProposal>(`/repair-proposals/${id}/reject`, { rejectReason }).then((r) => r.data),
  complete: (id: number) => api.patch<RepairProposal>(`/repair-proposals/${id}/complete`).then((r) => r.data),
  delete: (id: number) => api.delete(`/repair-proposals/${id}`).then((r) => r.data),
}
