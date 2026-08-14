import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  handoverApi,
  certificateApi,
  machineDocumentApi,
  maintenanceNormApi,
  type CreateHandoverDto,
  type CreateCertificateDto,
  type CreateMachineDocumentDto,
  type CreateMaintenanceNormDto,
} from './mmtb.api'

// ===== Biên bản bàn giao =====
const HANDOVER = 'machine-handovers'

export function useHandovers(params?: { type?: string; status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [HANDOVER, params], queryFn: () => handoverApi.list(params) })
}

export function useHandover(id?: number) {
  return useQuery({ queryKey: [HANDOVER, id], queryFn: () => handoverApi.get(id!), enabled: !!id })
}

export function useCreateHandover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateHandoverDto) => handoverApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [HANDOVER] }); toast.success('Đã lập biên bản bàn giao') },
  })
}

export function useUpdateHandover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateHandoverDto, 'machineId' | 'type'>> }) => handoverApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [HANDOVER] }); toast.success('Đã cập nhật biên bản') },
  })
}

export function useConfirmHandoverSender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => handoverApi.confirmSender(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [HANDOVER] }); toast.success('Bên giao đã xác nhận') },
  })
}

export function useConfirmHandoverReceiver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => handoverApi.confirmReceiver(id),
    onSuccess: () => {
      // Bàn giao hoàn tất làm thay đổi trạng thái/chuyền của máy
      qc.invalidateQueries({ queryKey: [HANDOVER] })
      qc.invalidateQueries({ queryKey: ['machines'] })
      toast.success('Đã hoàn tất bàn giao')
    },
  })
}

export function useRejectHandover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) => handoverApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [HANDOVER] }); toast.success('Đã từ chối biên bản') },
  })
}

export function useDeleteHandover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => handoverApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [HANDOVER] }); toast.success('Đã xóa biên bản') },
  })
}

// ===== Chứng chỉ / kiểm định =====
const CERT = 'machine-certificates'

export function useCertificates(params?: { machineId?: number; expiringInDays?: number }) {
  return useQuery({ queryKey: [CERT, params], queryFn: () => certificateApi.list(params) })
}

export function useCreateCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCertificateDto) => certificateApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CERT] }); toast.success('Đã thêm chứng chỉ') },
  })
}

export function useUpdateCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateCertificateDto> }) => certificateApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CERT] }); toast.success('Đã cập nhật chứng chỉ') },
  })
}

export function useDeleteCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => certificateApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CERT] }); toast.success('Đã xóa chứng chỉ') },
  })
}

// ===== Tài liệu hồ sơ máy =====
const DOC = 'machine-documents'

export function useMachineDocuments(machineId?: number, type?: string) {
  return useQuery({
    queryKey: [DOC, machineId, type],
    queryFn: () => machineDocumentApi.list(machineId!, type),
    enabled: !!machineId,
  })
}

export function useCreateMachineDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMachineDocumentDto) => machineDocumentApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DOC] }); toast.success('Đã thêm tài liệu') },
  })
}

export function useDeleteMachineDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => machineDocumentApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DOC] }); toast.success('Đã xóa tài liệu') },
  })
}

// ===== Định mức bảo dưỡng =====
const NORM = 'maintenance-norms'

export function useMaintenanceNorms(params?: { categoryId?: number; machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [NORM, params], queryFn: () => maintenanceNormApi.list(params) })
}

export function useNormForMachine(machineId?: number) {
  return useQuery({
    queryKey: [NORM, 'for-machine', machineId],
    queryFn: () => maintenanceNormApi.forMachine(machineId!),
    enabled: !!machineId,
  })
}

export function useCreateMaintenanceNorm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMaintenanceNormDto) => maintenanceNormApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [NORM] }); toast.success('Đã tạo định mức bảo dưỡng') },
  })
}

export function useUpdateMaintenanceNorm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateMaintenanceNormDto> }) => maintenanceNormApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [NORM] }); toast.success('Đã cập nhật định mức') },
  })
}

export function useDeleteMaintenanceNorm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => maintenanceNormApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [NORM] }); toast.success('Đã xóa định mức') },
  })
}
