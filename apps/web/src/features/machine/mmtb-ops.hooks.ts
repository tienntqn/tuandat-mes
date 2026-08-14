import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { breakdownApi, incidentApi, type CreateBreakdownDto, type CreateIncidentDto } from './breakdown.api'
import { workOrderApi, type CreateWorkOrderDto, type CompleteWorkOrderDto } from './work-order.api'
import { stockApi, type ReceiveStockDto, type AdjustStockDto } from './stock.api'

const BREAKDOWN = 'breakdown-reports'
const INCIDENT = 'incident-reports'
const WORK_ORDER = 'work-orders'
const STOCK = 'spare-part-stocks'

/** Các nghiệp vụ sửa chữa/bảo dưỡng đều ảnh hưởng trạng thái máy nên làm mới luôn danh sách máy. */
function invalidateMachineFlow(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [BREAKDOWN] })
  qc.invalidateQueries({ queryKey: [WORK_ORDER] })
  qc.invalidateQueries({ queryKey: ['machines'] })
}

// ===== Phiếu báo hỏng =====

export function useBreakdowns(params?: { status?: string; severity?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [BREAKDOWN, params], queryFn: () => breakdownApi.list(params) })
}

export function useBreakdown(id?: number) {
  return useQuery({ queryKey: [BREAKDOWN, id], queryFn: () => breakdownApi.get(id!), enabled: !!id })
}

export function useCreateBreakdown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateBreakdownDto) => breakdownApi.create(dto),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã lập phiếu báo hỏng') },
  })
}

export function useUpdateBreakdown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateBreakdownDto, 'machineId'>> }) => breakdownApi.update(id, dto),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã cập nhật phiếu') },
  })
}

export function useAcknowledgeBreakdown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => breakdownApi.acknowledge(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã tiếp nhận phiếu báo hỏng') },
  })
}

export function useResolveBreakdown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => breakdownApi.resolve(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã đóng phiếu báo hỏng') },
  })
}

export function useCancelBreakdown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => breakdownApi.cancel(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã hủy phiếu báo hỏng') },
  })
}

// ===== Biên bản sự cố =====

export function useIncidents(params?: { machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [INCIDENT, params], queryFn: () => incidentApi.list(params) })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateIncidentDto) => incidentApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INCIDENT] })
      qc.invalidateQueries({ queryKey: [BREAKDOWN] })
      toast.success('Đã lập biên bản sự cố')
    },
  })
}

export function useUpdateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateIncidentDto, 'machineId'>> }) => incidentApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INCIDENT] }); toast.success('Đã cập nhật biên bản') },
  })
}

export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => incidentApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INCIDENT] }); toast.success('Đã xóa biên bản') },
  })
}

// ===== Phiếu sửa chữa / bảo dưỡng =====

export function useWorkOrders(params?: { type?: string; status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [WORK_ORDER, params], queryFn: () => workOrderApi.list(params) })
}

export function useWorkOrder(id?: number) {
  return useQuery({ queryKey: [WORK_ORDER, id], queryFn: () => workOrderApi.get(id!), enabled: !!id })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateWorkOrderDto) => workOrderApi.create(dto),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã lập phiếu') },
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateWorkOrderDto, 'machineId' | 'type'>> }) => workOrderApi.update(id, dto),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã cập nhật phiếu') },
  })
}

export function useStartWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workOrderApi.start(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã bắt đầu thực hiện') },
  })
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CompleteWorkOrderDto }) => workOrderApi.complete(id, dto),
    onSuccess: () => {
      // Hoàn thành phiếu có trừ kho vật tư nên phải làm mới cả tồn kho
      invalidateMachineFlow(qc)
      qc.invalidateQueries({ queryKey: [STOCK] })
      toast.success('Đã hoàn thành — hãy lập biên bản bàn giao')
    },
  })
}

export function useCancelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workOrderApi.cancel(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã hủy phiếu') },
  })
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workOrderApi.delete(id),
    onSuccess: () => { invalidateMachineFlow(qc); toast.success('Đã xóa phiếu') },
  })
}

// ===== Tồn kho phụ tùng =====

export function useStocks(params?: { factoryId?: number; search?: string; belowMin?: boolean }) {
  return useQuery({ queryKey: [STOCK, params], queryFn: () => stockApi.list(params) })
}

export function useStockMovements(params?: { sparePartId?: number; factoryId?: number; type?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [STOCK, 'movements', params], queryFn: () => stockApi.movements(params) })
}

export function useReceiveStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ReceiveStockDto) => stockApi.receive(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [STOCK] }); toast.success('Đã nhập kho') },
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: AdjustStockDto) => stockApi.adjust(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [STOCK] }); toast.success('Đã điều chỉnh tồn kho') },
  })
}

export function useSetMinQuantity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { sparePartId: number; factoryId: number; minQuantity: number; location?: string }) => stockApi.setMinQuantity(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [STOCK] }); toast.success('Đã lưu định mức tồn') },
  })
}
