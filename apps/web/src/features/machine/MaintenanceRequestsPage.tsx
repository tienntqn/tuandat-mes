import { useState } from 'react'
import { X, Check, Settings } from 'lucide-react'
import {
  useMaintenanceRequests,
  useCreateMaintenanceRequest,
  useAcceptMaintenanceRequest,
  useRejectMaintenanceRequest,
  useDeleteMaintenanceRequest,
} from './maintenance-plan.hooks'
import { useCreateWorkOrder } from './mmtb-ops.hooks'
import { useMachines } from './machine.hooks'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
  type MaintenanceRequest,
  type MaintenanceRequestStatus,
  type CreateMaintenanceRequestDto,
} from './maintenance-plan.api'
import { WorkOrderFormDialog } from './WorkOrderFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function MaintenanceRequestsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | MaintenanceRequestStatus>('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<MaintenanceRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null)
  const [workOrderFor, setWorkOrderFor] = useState<MaintenanceRequest | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useMaintenanceRequests({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createRequest = useCreateMaintenanceRequest()
  const accept = useAcceptMaintenanceRequest()
  const reject = useRejectMaintenanceRequest()
  const del = useDeleteMaintenanceRequest()
  const createWorkOrder = useCreateWorkOrder()

  return (
    <PageWrapper
      title="Phiếu yêu cầu bảo dưỡng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Yêu cầu bảo dưỡng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => setFormOpen(true)} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập yêu cầu
            </button>
          )}
        </div>
      }
    >
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as MaintenanceRequestStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(REQUEST_STATUS_LABELS) as MaintenanceRequestStatus[]).map((s) => (
              <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số phiếu, mã máy, lý do..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} phiếu</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Số phiếu</th><th>Máy</th><th>Lý do đề nghị</th>
              <th className="text-center">Ngày đề nghị</th><th className="text-center">Mong muốn</th>
              <th className="text-center">Trạng thái</th><th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có phiếu yêu cầu nào</td></tr>
            ) : (
              data?.data.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.requestNo}</code></td>
                  <td>
                    <div className="fw-medium">{r.machine?.code}</div>
                    <div className="small text-muted">{r.machine?.name}</div>
                  </td>
                  <td style={{ maxWidth: 260 }} className="small">
                    {r.reason}
                    {r.rejectReason && <div className="text-danger small mt-1">Từ chối: {r.rejectReason}</div>}
                    {r.workOrders && r.workOrders.length > 0 && (
                      <div className="text-muted small mt-1">Phiếu BD: {r.workOrders.map((w) => w.orderNo).join(', ')}</div>
                    )}
                  </td>
                  <td className="text-center small">{fmtDate(r.requestedAt)}</td>
                  <td className="text-center small">{fmtDate(r.desiredDate)}</td>
                  <td className="text-center"><span className={`badge ${REQUEST_STATUS_BADGE[r.status]}`}>{REQUEST_STATUS_LABELS[r.status]}</span></td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1 flex-wrap">
                      {canWrite && r.status === 'PENDING' && (
                        <>
                          <button onClick={() => accept.mutate(r.id)} disabled={accept.isPending} className="btn btn-sm btn-outline-primary">
                            <Check size={13} /> Tiếp nhận
                          </button>
                          <button onClick={() => { setRejectTarget(r); setRejectReason('') }} className="btn btn-sm btn-outline-danger">Từ chối</button>
                        </>
                      )}
                      {canWrite && r.status === 'ACCEPTED' && (
                        <button onClick={() => setWorkOrderFor(r)} className="btn btn-sm btn-primary text-white">
                          <Settings size={13} /> Lập phiếu BD
                        </button>
                      )}
                      {canWrite && r.status === 'PENDING' && (
                        <button onClick={() => setDeleteTarget(r)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <RequestFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(dto) => createRequest.mutate(dto, { onSuccess: () => setFormOpen(false) })}
        isPending={createRequest.isPending}
      />

      <WorkOrderFormDialog
        open={!!workOrderFor}
        defaultType="MAINTENANCE"
        defaultMachineId={workOrderFor?.machineId}
        maintenanceRequestId={workOrderFor?.id}
        defaultContent={workOrderFor ? `Bảo dưỡng theo yêu cầu ${workOrderFor.requestNo}: ${workOrderFor.reason}` : ''}
        onClose={() => setWorkOrderFor(null)}
        onSubmit={(dto) => createWorkOrder.mutate(dto, { onSuccess: () => setWorkOrderFor(null) })}
        isPending={createWorkOrder.isPending}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-lg">Từ chối yêu cầu</h2>
              <button onClick={() => setRejectTarget(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="small text-muted">Phiếu {rejectTarget.requestNo} — máy {rejectTarget.machine?.code}</div>
              <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Lý do từ chối *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejectTarget(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
                <button
                  disabled={!rejectReason.trim() || reject.isPending}
                  onClick={() => reject.mutate({ id: rejectTarget.id, rejectReason: rejectReason.trim() }, { onSuccess: () => setRejectTarget(null) })}
                  className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
                  style={{ background: '#dc3545' }}
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa phiếu yêu cầu"
        description={`Xóa phiếu ${deleteTarget?.requestNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={del.isPending}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}

function RequestFormDialog({
  open, onClose, onSubmit, isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateMaintenanceRequestDto) => void
  isPending?: boolean
}) {
  const [machineId, setMachineId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [desiredDate, setDesiredDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const { data: machinesData } = useMachines({ pageSize: 500 })
  const machines = machinesData?.data ?? []

  if (!open) return null

  const reset = () => { setMachineId(''); setReason(''); setDesiredDate(''); setNote(''); setError('') }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Lập phiếu yêu cầu bảo dưỡng</h2>
          <button onClick={() => { reset(); onClose() }}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!machineId) { setError('Phải chọn máy'); return }
            if (!reason.trim()) { setError('Phải nhập lý do đề nghị'); return }
            onSubmit({
              machineId: Number(machineId),
              reason: reason.trim(),
              desiredDate: desiredDate || undefined,
              note: note.trim() || undefined,
            })
            reset()
          }}
          className="p-5 space-y-3"
        >
          <div>
            <label className="text-sm font-medium mb-1 block">Máy *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Chọn máy —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Lý do đề nghị bảo dưỡng *</label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Máy đã đến hạn bảo dưỡng định kỳ 3 tháng, chạy có tiếng lạ" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ngày mong muốn thực hiện</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { reset(); onClose() }} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : 'Lập phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
