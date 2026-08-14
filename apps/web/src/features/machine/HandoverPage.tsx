import { useState, useEffect } from 'react'
import { X, Check, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  useHandovers,
  useCreateHandover,
  useConfirmHandoverSender,
  useConfirmHandoverReceiver,
  useRejectHandover,
  useDeleteHandover,
} from './mmtb.hooks'
import { machineApi, transferApi } from './machine.api'
import { lineApi } from '@/features/production-line/line.api'
import {
  HANDOVER_TYPE_LABELS,
  HANDOVER_STATUS_LABELS,
  type MachineHandover,
  type CreateHandoverDto,
  type HandoverType,
  type HandoverStatus,
} from './mmtb.api'
import { HandoverPrint } from './HandoverPrint'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

const STATUS_BADGE: Record<HandoverStatus, string> = {
  DRAFT: 'bg-secondary-transparent',
  PENDING_RECEIVER: 'bg-warning-transparent',
  COMPLETED: 'bg-success-transparent',
  REJECTED: 'bg-danger-transparent',
}

export default function HandoverPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'' | HandoverType>('')
  const [statusFilter, setStatusFilter] = useState<'' | HandoverStatus>('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<MachineHandover | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MachineHandover | null>(null)
  const [printTarget, setPrintTarget] = useState<MachineHandover | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useHandovers({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createHandover = useCreateHandover()
  const confirmSender = useConfirmHandoverSender()
  const confirmReceiver = useConfirmHandoverReceiver()
  const reject = useRejectHandover()
  const del = useDeleteHandover()

  return (
    <PageWrapper
      title="Biên bản bàn giao máy"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Biên bản bàn giao' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => setFormOpen(true)} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập biên bản
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Biên bản bàn giao có <strong>2 bước xác nhận</strong>: bên giao ký trước, sau đó bên nhận ký.
        Máy chỉ được cập nhật chuyền và trạng thái khi bên nhận đã xác nhận.
      </div>

      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as HandoverType | ''); setPage(1) }}>
            <option value="">Tất cả loại biên bản</option>
            {(Object.keys(HANDOVER_TYPE_LABELS) as HandoverType[]).map((t) => (
              <option key={t} value={t}>{HANDOVER_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as HandoverStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(HANDOVER_STATUS_LABELS) as HandoverStatus[]).map((s) => (
              <option key={s} value={s}>{HANDOVER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số biên bản, mã máy..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} biên bản</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Số biên bản</th><th>Loại</th><th>Máy</th><th>Chuyền nhận</th>
              <th className="text-center">Ngày</th><th className="text-center">Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có biên bản bàn giao nào</td></tr>
            ) : (
              data?.data.map((h) => (
                <tr key={h.id}>
                  <td><code>{h.handoverNo}</code></td>
                  <td className="small">{HANDOVER_TYPE_LABELS[h.type]}</td>
                  <td>
                    <div className="fw-medium">{h.machine?.code}</div>
                    <div className="small text-muted">{h.machine?.name}</div>
                  </td>
                  <td className="small text-muted">{h.line?.name ?? '—'}</td>
                  <td className="text-center small">{fmtDate(h.handoverDate)}</td>
                  <td className="text-center">
                    <span className={`badge ${STATUS_BADGE[h.status]}`}>{HANDOVER_STATUS_LABELS[h.status]}</span>
                    {h.status === 'REJECTED' && h.rejectReason && (
                      <div className="small text-danger mt-1">{h.rejectReason}</div>
                    )}
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      <button onClick={() => setPrintTarget(h)} className="btn btn-sm btn-outline-secondary" title="In biên bản"><Printer size={13} /></button>
                      {canWrite && h.status === 'DRAFT' && (
                        <button onClick={() => confirmSender.mutate(h.id)} disabled={confirmSender.isPending} className="btn btn-sm btn-outline-primary">
                          <Check size={13} /> Bên giao ký
                        </button>
                      )}
                      {canWrite && h.status === 'PENDING_RECEIVER' && (
                        <button onClick={() => confirmReceiver.mutate(h.id)} disabled={confirmReceiver.isPending} className="btn btn-sm btn-primary text-white">
                          <Check size={13} /> Bên nhận ký
                        </button>
                      )}
                      {canWrite && h.status !== 'COMPLETED' && h.status !== 'REJECTED' && (
                        <button onClick={() => { setRejectTarget(h); setRejectReason('') }} className="btn btn-sm btn-outline-danger">Từ chối</button>
                      )}
                      {canWrite && h.status === 'DRAFT' && (
                        <button onClick={() => setDeleteTarget(h)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <HandoverFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(dto) => createHandover.mutate(dto, { onSuccess: () => setFormOpen(false) })}
        isPending={createHandover.isPending}
      />

      {/* Từ chối biên bản — bắt buộc nhập lý do */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-lg">Từ chối biên bản</h2>
              <button onClick={() => setRejectTarget(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="small text-muted">Biên bản {rejectTarget.handoverNo} — máy {rejectTarget.machine?.code}</div>
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
        title="Xóa biên bản"
        description={`Xóa biên bản ${deleteTarget?.handoverNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={del.isPending}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />

      {printTarget && <HandoverPrint handover={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}

function HandoverFormDialog({
  open, onClose, onSubmit, isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateHandoverDto) => void
  isPending?: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<CreateHandoverDto>({ type: 'RECEIVE', machineId: 0, handoverDate: today })
  const [error, setError] = useState('')

  const { data: machines } = useQuery({ queryKey: ['machines-for-handover'], queryFn: () => machineApi.list({ pageSize: 500 }), enabled: open })
  const { data: options } = useQuery({ queryKey: ['transfer-form-options'], queryFn: transferApi.formOptions, enabled: open })
  const { data: linesData } = useQuery({ queryKey: ['lines-all'], queryFn: () => lineApi.list({ pageSize: 200 }), enabled: open })

  useEffect(() => {
    if (open) { setForm({ type: 'RECEIVE', machineId: 0, handoverDate: today }); setError('') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  // Chỉ cho chọn chuyền thuộc xưởng của máy được chọn
  const selectedMachine = machines?.data.find((m) => m.id === form.machineId)
  const lines = (linesData?.data ?? []).filter((l) => !selectedMachine || l.factoryId === selectedMachine.factoryId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Lập biên bản bàn giao</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.machineId) { setError('Phải chọn máy'); return }
            if (!form.handoverDate) { setError('Phải chọn ngày bàn giao'); return }
            onSubmit({
              ...form,
              fromParty: form.fromParty?.trim() || undefined,
              condition: form.condition?.trim() || undefined,
              accessories: form.accessories?.trim() || undefined,
              note: form.note?.trim() || undefined,
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Loại biên bản *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as HandoverType })}>
                {(Object.keys(HANDOVER_TYPE_LABELS) as HandoverType[]).map((t) => (
                  <option key={t} value={t}>{HANDOVER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 170 }}>
              <label className="text-sm font-medium mb-1 block">Ngày bàn giao *</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.handoverDate} onChange={(e) => setForm({ ...form, handoverDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Máy *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.machineId || ''} onChange={(e) => setForm({ ...form, machineId: Number(e.target.value), lineId: undefined })}>
              <option value="">— Chọn máy —</option>
              {machines?.data.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Chuyền tiếp nhận</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.lineId ?? ''} onChange={(e) => setForm({ ...form, lineId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">— Chưa gán chuyền —</option>
              {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {form.type === 'RECEIVE' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Bên giao (đơn vị ngoài)</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.fromParty ?? ''} onChange={(e) => setForm({ ...form, fromParty: e.target.value })} placeholder="VD: Công ty TNHH Juki Việt Nam" />
            </div>
          )}

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Người giao</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.senderId ?? ''} onChange={(e) => setForm({ ...form, senderId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— Chọn —</option>
                {options?.people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Người nhận</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.receiverId ?? ''} onChange={(e) => setForm({ ...form, receiverId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— Chọn —</option>
                {options?.people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tình trạng máy khi bàn giao</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.condition ?? ''} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="VD: Máy mới 100%, chạy thử đạt yêu cầu" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Phụ kiện kèm theo</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.accessories ?? ''} onChange={(e) => setForm({ ...form, accessories: e.target.value })} placeholder="VD: 1 bàn máy, 1 mô tơ, bộ chân vịt" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : 'Lập biên bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
