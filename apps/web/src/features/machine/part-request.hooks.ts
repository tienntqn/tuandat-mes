import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  partRequestApi,
  type CreatePartRequestDto,
  type ReceivePartRequestDto,
} from './part-request.api'

const PART_REQUEST = 'part-requests'
const STOCK = 'spare-part-stocks'

export function usePartRequests(params?: { type?: string; status?: string; factoryId?: number; search?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [PART_REQUEST, params], queryFn: () => partRequestApi.list(params) })
}

export function usePartRequest(id?: number) {
  return useQuery({ queryKey: [PART_REQUEST, id], queryFn: () => partRequestApi.get(id!), enabled: !!id })
}

export function useMaterialNeeds(workPlanId?: number) {
  return useQuery({
    queryKey: [PART_REQUEST, 'material-needs', workPlanId],
    queryFn: () => partRequestApi.materialNeeds(workPlanId!),
    enabled: !!workPlanId,
  })
}

export function useCreatePartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePartRequestDto) => partRequestApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã lập yêu cầu mua vật tư') },
  })
}

export function useUpdatePartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<Omit<CreatePartRequestDto, 'type' | 'factoryId'>> }) =>
      partRequestApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã cập nhật yêu cầu') },
  })
}

export function useSubmitPartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => partRequestApi.submit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã trình yêu cầu lên giám đốc xưởng') },
  })
}

export function useApprovePartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => partRequestApi.approve(id),
    onSuccess: (req) => {
      qc.invalidateQueries({ queryKey: [PART_REQUEST] })
      toast.success(
        req.status === 'PENDING_COMPANY'
          ? 'Xưởng đã duyệt — chuyển công ty duyệt tiếp'
          : 'Đã duyệt yêu cầu mua vật tư',
      )
    },
  })
}

export function useRejectPartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) => partRequestApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã từ chối yêu cầu') },
  })
}

export function useReceivePartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ReceivePartRequestDto }) => partRequestApi.receive(id, dto),
    onSuccess: () => {
      // Nhập kho làm thay đổi tồn nên phải làm mới cả danh sách tồn kho
      qc.invalidateQueries({ queryKey: [PART_REQUEST] })
      qc.invalidateQueries({ queryKey: [STOCK] })
      toast.success('Đã nhập kho vật tư')
    },
  })
}

export function useCancelPartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => partRequestApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã hủy yêu cầu') },
  })
}

export function useDeletePartRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => partRequestApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PART_REQUEST] }); toast.success('Đã xóa yêu cầu') },
  })
}
