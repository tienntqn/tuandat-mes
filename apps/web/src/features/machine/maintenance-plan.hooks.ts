import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  maintenanceRequestApi,
  workPlanApi,
  type CreateMaintenanceRequestDto,
  type CreateWorkPlanDto,
} from './maintenance-plan.api'

const REQUEST = 'maintenance-requests'
const PLAN = 'work-plans'

// ===== Phiếu yêu cầu bảo dưỡng =====

export function useMaintenanceRequests(params?: { status?: string; machineId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [REQUEST, params], queryFn: () => maintenanceRequestApi.list(params) })
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMaintenanceRequestDto) => maintenanceRequestApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [REQUEST] }); toast.success('Đã lập phiếu yêu cầu bảo dưỡng') },
  })
}

export function useUpdateMaintenanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateMaintenanceRequestDto, 'machineId'>> }) =>
      maintenanceRequestApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [REQUEST] }); toast.success('Đã cập nhật phiếu') },
  })
}

export function useAcceptMaintenanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => maintenanceRequestApi.accept(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [REQUEST] }); toast.success('Đã tiếp nhận yêu cầu') },
  })
}

export function useRejectMaintenanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) => maintenanceRequestApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [REQUEST] }); toast.success('Đã từ chối yêu cầu') },
  })
}

export function useDeleteMaintenanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => maintenanceRequestApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [REQUEST] }); toast.success('Đã xóa phiếu yêu cầu') },
  })
}

// ===== Kế hoạch sửa chữa / bảo dưỡng =====

export function useWorkPlans(params?: { type?: string; status?: string; factoryId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [PLAN, params], queryFn: () => workPlanApi.list(params) })
}

export function useWorkPlan(id?: number) {
  return useQuery({ queryKey: [PLAN, id], queryFn: () => workPlanApi.get(id!), enabled: !!id })
}

export function useMaintenanceForecast(params?: { daysAhead?: number; factoryId?: number }) {
  return useQuery({ queryKey: [PLAN, 'forecast', params], queryFn: () => workPlanApi.forecast(params) })
}

export function useCreateWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateWorkPlanDto) => workPlanApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã lập kế hoạch') },
  })
}

export function useUpdateWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreateWorkPlanDto, 'type' | 'factoryId'>> }) =>
      workPlanApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã cập nhật kế hoạch') },
  })
}

export function useSubmitWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.submit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã trình kế hoạch lên giám đốc xưởng') },
  })
}

export function useApproveWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.approve(id),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: [PLAN] })
      // Backend tự quyết định còn phải trình công ty hay đã duyệt xong
      toast.success(
        plan.status === 'PENDING_COMPANY'
          ? 'Xưởng đã duyệt — chuyển công ty duyệt tiếp'
          : 'Đã duyệt kế hoạch',
      )
    },
  })
}

export function useRejectWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) => workPlanApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã từ chối kế hoạch') },
  })
}

export function useStartWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã bắt đầu triển khai') },
  })
}

export function useCompleteWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã kết thúc kế hoạch') },
  })
}

export function useCancelWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã hủy kế hoạch') },
  })
}

export function useDeleteWorkPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workPlanApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLAN] }); toast.success('Đã xóa kế hoạch') },
  })
}
