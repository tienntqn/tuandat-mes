import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { repairApi, type CreateRepairProposalDto, type UpdateRepairProposalDto } from './repair.api'

const KEY = 'repair-proposals'

export function useRepairProposals(params?: { machineId?: number; status?: string; page?: number; pageSize?: number }) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => repairApi.list(params) })
}

export function useRepairProposal(id: number) {
  return useQuery({ queryKey: [KEY, id], queryFn: () => repairApi.get(id), enabled: !!id })
}

export function useCreateRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (dto: CreateRepairProposalDto) => repairApi.create(dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã tạo đề xuất') } })
}
export function useUpdateRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, dto }: { id: number; dto: UpdateRepairProposalDto }) => repairApi.update(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã cập nhật đề xuất') } })
}
export function useSubmitRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => repairApi.submit(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã gửi duyệt') } })
}
export function useApproveRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => repairApi.approve(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã duyệt đề xuất') } })
}
export function useRejectRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) => repairApi.reject(id, rejectReason), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã từ chối đề xuất') } })
}
export function useCompleteRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => repairApi.complete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã hoàn thành đề xuất') } })
}
export function useDeleteRepairProposal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => repairApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Đã xóa đề xuất') } })
}
