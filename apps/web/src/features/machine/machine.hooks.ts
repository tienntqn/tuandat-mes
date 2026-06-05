import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  machineApi, maintenanceApi, transferApi,
  type MachineParams, type CreateMachineDto, type UpdateMachineDto,
  type CreateMaintenanceDto, type CreateTransferDto, type LiquidateMachineDto,
} from './machine.api'
import { toast } from '@/lib/toast'

const MACHINE_KEY = 'machines'
const MAINTENANCE_KEY = 'machine-maintenances'
const TRANSFER_KEY = 'machine-transfers'

// --- Machines ---
export function useMachines(params?: MachineParams) {
  return useQuery({ queryKey: [MACHINE_KEY, params], queryFn: () => machineApi.list(params) })
}

export function useMachine(id: number) {
  return useQuery({ queryKey: [MACHINE_KEY, id], queryFn: () => machineApi.get(id), enabled: !!id })
}

export function useMaintenanceDue(daysAhead?: number) {
  return useQuery({
    queryKey: [MACHINE_KEY, 'maintenance-due', daysAhead],
    queryFn: () => machineApi.maintenanceDue(daysAhead),
  })
}

export function useCreateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMachineDto) => machineApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [MACHINE_KEY] }); toast.success('Đã thêm máy') },
  })
}

export function useUpdateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateMachineDto }) => machineApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [MACHINE_KEY] }); toast.success('Đã cập nhật máy') },
  })
}

export function useAssignLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lineId }: { id: number; lineId: number | null }) => machineApi.assignLine(id, lineId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MACHINE_KEY] })
      toast.success(vars.lineId ? 'Đã gán chuyền' : 'Đã gỡ khỏi chuyền')
    },
  })
}

export function useDeleteMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => machineApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [MACHINE_KEY] }); toast.success('Đã xóa máy') },
  })
}

export function useLiquidatedMachines(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [MACHINE_KEY, 'liquidated', params],
    queryFn: () => machineApi.listLiquidated(params),
  })
}

export function useLiquidateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: LiquidateMachineDto }) => machineApi.liquidate(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [MACHINE_KEY] }); toast.success('Đã thanh lý máy') },
  })
}

// --- Maintenance ---
export function useMaintenances(machineId: number, page?: number) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, machineId, page],
    queryFn: () => maintenanceApi.list(machineId, page),
    enabled: !!machineId,
  })
}

export function useCreateMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMaintenanceDto) => maintenanceApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MAINTENANCE_KEY] })
      qc.invalidateQueries({ queryKey: [MACHINE_KEY] })
      toast.success('Đã ghi nhận bảo dưỡng')
    },
  })
}

// --- Transfers ---
export function useTransfers(params?: { machineId?: number; status?: string; page?: number }) {
  return useQuery({
    queryKey: [TRANSFER_KEY, params],
    queryFn: () => transferApi.list(params),
  })
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: [TRANSFER_KEY, id],
    queryFn: () => transferApi.get(id),
    enabled: !!id,
  })
}

export function useMachineTransferHistory(machineId: number) {
  return useQuery({
    queryKey: [TRANSFER_KEY, 'history', machineId],
    queryFn: () => transferApi.history(machineId),
    enabled: !!machineId,
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTransferDto) => transferApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TRANSFER_KEY] }); toast.success('Đã tạo lệnh điều chuyển') },
  })
}

export function useConfirmSender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transferApi.confirmSender(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSFER_KEY] })
      toast.success('Đã xác nhận (bên đưa)')
    },
  })
}

export function useConfirmReceiver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transferApi.confirmReceiver(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSFER_KEY] })
      qc.invalidateQueries({ queryKey: [MACHINE_KEY] })
      toast.success('Đã xác nhận nhận máy — máy đã chuyển xưởng!')
    },
  })
}

export function useRejectTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      transferApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TRANSFER_KEY] }); toast.success('Đã từ chối lệnh') },
  })
}
