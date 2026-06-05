import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Send, Check, X as XIcon, CheckCheck, Edit2, Trash2 } from 'lucide-react'
import {
  useRepairProposals, useCreateRepairProposal, useUpdateRepairProposal,
  useSubmitRepairProposal, useApproveRepairProposal, useRejectRepairProposal,
  useCompleteRepairProposal, useDeleteRepairProposal,
} from './repair.hooks'
import { RepairProposalDialog } from './RepairProposalDialog'
import { RepairProposalPrint } from './RepairProposalPrint'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import {
  REPAIR_TYPE_LABELS, REPAIR_STATUS_LABELS,
  type RepairProposal, type RepairProposalStatus, type CreateRepairProposalDto,
} from './repair.api'

const STATUS_BADGE: Record<RepairProposalStatus, string> = {
  DRAFT: 'bg-secondary',
  PENDING: 'bg-warning text-dark',
  APPROVED: 'bg-success',
  REJECTED: 'bg-danger',
  DONE: 'bg-primary',
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function RepairProposalsPage() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RepairProposal | null>(null)
  const [printId, setPrintId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RepairProposal | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  const canApprove = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data, isLoading, refetch } = useRepairProposals({ status: filterStatus || undefined, page, pageSize: 20 })
  const createP = useCreateRepairProposal()
  const updateP = useUpdateRepairProposal()
  const submitP = useSubmitRepairProposal()
  const approveP = useApproveRepairProposal()
  const rejectP = useRejectRepairProposal()
  const completeP = useCompleteRepairProposal()
  const deleteP = useDeleteRepairProposal()

  const handleSubmit = (dto: CreateRepairProposalDto) => {
    if (editTarget) updateP.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createP.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  const handleReject = (p: RepairProposal) => {
    const reason = window.prompt('Lý do từ chối đề xuất:')
    if (reason && reason.trim()) rejectP.mutate({ id: p.id, rejectReason: reason.trim() })
  }

  return (
    <PageWrapper
      title="Đề xuất sửa chữa / thay thế"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Đề xuất sửa chữa' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white"><span><i className="fe fe-plus"></i></span> Tạo đề xuất</button>}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} đề xuất</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light"><tr><th>Số</th><th>Máy</th><th>Tiêu đề</th><th>Loại</th><th>Ngày</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có đề xuất nào</td></tr>
            ) : (
              data?.data.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.proposalNo}</code></td>
                  <td><Link to={`/machines/${p.machineId}`} className="text-decoration-none">{p.machine?.code}</Link></td>
                  <td className="fw-medium">{p.title}</td>
                  <td>{REPAIR_TYPE_LABELS[p.type]}</td>
                  <td className="text-muted">{fmtDate(p.createdAt)}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{REPAIR_STATUS_LABELS[p.status]}</span>{p.status === 'REJECTED' && p.rejectReason && <div className="small text-danger">{p.rejectReason}</div>}</td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1 flex-wrap">
                      <button onClick={() => setPrintId(p.id)} title="In phiếu" className="btn btn-sm btn-outline-secondary"><Printer size={14} /></button>
                      {canWrite && p.status === 'DRAFT' && (
                        <>
                          <button onClick={() => { setEditTarget(p); setFormOpen(true) }} title="Sửa" className="btn btn-sm btn-outline-secondary"><Edit2 size={14} /></button>
                          <button onClick={() => submitP.mutate(p.id)} title="Gửi duyệt" className="btn btn-sm btn-outline-primary"><Send size={14} /></button>
                          <button onClick={() => setDeleteTarget(p)} title="Xóa" className="btn btn-sm btn-outline-danger"><Trash2 size={14} /></button>
                        </>
                      )}
                      {canApprove && p.status === 'PENDING' && (
                        <>
                          <button onClick={() => approveP.mutate(p.id)} title="Duyệt" className="btn btn-sm btn-outline-success"><Check size={14} /></button>
                          <button onClick={() => handleReject(p)} title="Từ chối" className="btn btn-sm btn-outline-danger"><XIcon size={14} /></button>
                        </>
                      )}
                      {canWrite && p.status === 'APPROVED' && (
                        <button onClick={() => completeP.mutate(p.id)} title="Hoàn thành" className="btn btn-sm btn-outline-primary"><CheckCheck size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <RepairProposalDialog open={formOpen} proposal={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createP.isPending || updateP.isPending} />
      <RepairProposalPrint open={printId !== null} proposalId={printId} onClose={() => setPrintId(null)} />
      <ConfirmDialog open={!!deleteTarget} title="Xóa đề xuất" description={`Xóa đề xuất "${deleteTarget?.proposalNo}"?`} confirmLabel="Xóa" destructive isPending={deleteP.isPending} onConfirm={() => deleteTarget && deleteP.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })} onClose={() => setDeleteTarget(null)} />
    </PageWrapper>
  )
}
