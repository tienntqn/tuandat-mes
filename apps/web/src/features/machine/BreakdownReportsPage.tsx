import { useState } from 'react'
import { X, Check, Printer, Wrench, FileWarning, AlertOctagon } from 'lucide-react'
import {
  useBreakdowns,
  useCreateBreakdown,
  useAcknowledgeBreakdown,
  useResolveBreakdown,
  useCancelBreakdown,
  useCreateWorkOrder,
  useCreateIncident,
} from './mmtb-ops.hooks'
import { useMachines } from './machine.hooks'
import {
  SEVERITY_LABELS,
  SEVERITY_BADGE,
  BREAKDOWN_STATUS_LABELS,
  BREAKDOWN_STATUS_BADGE,
  type BreakdownReport,
  type CreateBreakdownDto,
  type BreakdownSeverity,
  type BreakdownStatus,
  type CreateIncidentDto,
} from './breakdown.api'
import type { CreateWorkOrderDto } from './work-order.api'
import { BreakdownPrint } from './BreakdownPrint'
import { IncidentFormDialog } from './IncidentFormDialog'
import { WorkOrderFormDialog } from './WorkOrderFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { FileUpload, type UploadedFile } from '@/components/shared/FileUpload'
import { useAuthStore } from '@/stores/auth.store'

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function BreakdownReportsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | BreakdownStatus>('')
  const [severityFilter, setSeverityFilter] = useState<'' | BreakdownSeverity>('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState<BreakdownReport | null>(null)
  const [incidentFor, setIncidentFor] = useState<BreakdownReport | null>(null)
  const [workOrderFor, setWorkOrderFor] = useState<BreakdownReport | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BreakdownReport | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useBreakdowns({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createBreakdown = useCreateBreakdown()
  const acknowledge = useAcknowledgeBreakdown()
  const resolve = useResolveBreakdown()
  const cancel = useCancelBreakdown()
  const createWorkOrder = useCreateWorkOrder()
  const createIncident = useCreateIncident()

  const openCount = (data?.data ?? []).filter((b) => b.status === 'REPORTED').length

  return (
    <PageWrapper
      title="Phiếu báo hỏng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Phiếu báo hỏng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => setFormOpen(true)} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Báo hỏng
            </button>
          )}
        </div>
      }
    >
      {openCount > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertOctagon size={16} /> Có <strong>{openCount}</strong> phiếu báo hỏng chưa được tiếp nhận.
        </div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as BreakdownStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(BREAKDOWN_STATUS_LABELS) as BreakdownStatus[]).map((s) => (
              <option key={s} value={s}>{BREAKDOWN_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <select className="form-select" value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value as BreakdownSeverity | ''); setPage(1) }}>
            <option value="">Mọi mức độ</option>
            {(Object.keys(SEVERITY_LABELS) as BreakdownSeverity[]).map((s) => (
              <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số phiếu, mã máy, hiện tượng..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} phiếu</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Số phiếu</th><th>Máy</th><th>Hiện tượng</th>
              <th className="text-center">Mức độ</th><th className="text-center">Thời điểm báo</th>
              <th className="text-center">Trạng thái</th><th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có phiếu báo hỏng nào</td></tr>
            ) : (
              data?.data.map((b) => (
                <tr key={b.id}>
                  <td>
                    <code>{b.reportNo}</code>
                    {b.stoppedProduction && <div><span className="badge bg-danger-transparent">Dừng sản xuất</span></div>}
                  </td>
                  <td>
                    <div className="fw-medium">{b.machine?.code}</div>
                    <div className="small text-muted">{b.machine?.name}</div>
                    {b.line && <div className="small text-muted">{b.line.name}</div>}
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <div className="small">{b.symptom}</div>
                    {b.incidentReport && <div className="small text-muted">Biên bản sự cố: {b.incidentReport.incidentNo}</div>}
                    {b.workOrders && b.workOrders.length > 0 && (
                      <div className="small text-muted">Phiếu sửa: {b.workOrders.map((w) => w.orderNo).join(', ')}</div>
                    )}
                  </td>
                  <td className="text-center"><span className={`badge ${SEVERITY_BADGE[b.severity]}`}>{SEVERITY_LABELS[b.severity]}</span></td>
                  <td className="text-center small">{fmtDateTime(b.reportedAt)}</td>
                  <td className="text-center"><span className={`badge ${BREAKDOWN_STATUS_BADGE[b.status]}`}>{BREAKDOWN_STATUS_LABELS[b.status]}</span></td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1 flex-wrap">
                      <button onClick={() => setPrintTarget(b)} className="btn btn-sm btn-outline-secondary" title="In phiếu"><Printer size={13} /></button>
                      {canWrite && b.status === 'REPORTED' && (
                        <button onClick={() => acknowledge.mutate(b.id)} disabled={acknowledge.isPending} className="btn btn-sm btn-outline-primary" title="Tiếp nhận">
                          <Check size={13} /> Tiếp nhận
                        </button>
                      )}
                      {canWrite && (b.status === 'ACKNOWLEDGED' || b.status === 'IN_REPAIR') && (
                        <button onClick={() => setWorkOrderFor(b)} className="btn btn-sm btn-primary text-white" title="Lập phiếu sửa chữa">
                          <Wrench size={13} /> Phiếu sửa
                        </button>
                      )}
                      {canWrite && !b.incidentReport && b.status !== 'CANCELLED' && (
                        <button onClick={() => setIncidentFor(b)} className="btn btn-sm btn-outline-warning" title="Lập biên bản sự cố">
                          <FileWarning size={13} /> Sự cố
                        </button>
                      )}
                      {canWrite && (b.status === 'ACKNOWLEDGED' || b.status === 'IN_REPAIR') && (
                        <button onClick={() => resolve.mutate(b.id)} disabled={resolve.isPending} className="btn btn-sm btn-outline-success">Đóng phiếu</button>
                      )}
                      {canWrite && b.status === 'REPORTED' && (
                        <button onClick={() => setCancelTarget(b)} className="btn btn-sm btn-outline-danger">Hủy</button>
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

      <BreakdownFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(dto) => createBreakdown.mutate(dto, { onSuccess: () => setFormOpen(false) })}
        isPending={createBreakdown.isPending}
      />

      {/* Lập phiếu sửa chữa ngay từ phiếu báo hỏng */}
      <WorkOrderFormDialog
        open={!!workOrderFor}
        defaultType="REPAIR"
        defaultMachineId={workOrderFor?.machineId}
        breakdownReportId={workOrderFor?.id}
        defaultContent={workOrderFor ? `Sửa chữa theo phiếu báo hỏng ${workOrderFor.reportNo}: ${workOrderFor.symptom}` : ''}
        onClose={() => setWorkOrderFor(null)}
        onSubmit={(dto: CreateWorkOrderDto) => createWorkOrder.mutate(dto, { onSuccess: () => setWorkOrderFor(null) })}
        isPending={createWorkOrder.isPending}
      />

      {/* Lập biên bản sự cố gắn với phiếu báo hỏng */}
      <IncidentFormDialog
        open={!!incidentFor}
        defaultMachineId={incidentFor?.machineId}
        breakdownReportId={incidentFor?.id}
        defaultDescription={incidentFor?.symptom}
        onClose={() => setIncidentFor(null)}
        onSubmit={(dto: CreateIncidentDto) => createIncident.mutate(dto, { onSuccess: () => setIncidentFor(null) })}
        isPending={createIncident.isPending}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Hủy phiếu báo hỏng"
        description={`Hủy phiếu ${cancelTarget?.reportNo}? Máy sẽ được trả về trạng thái chờ.`}
        confirmLabel="Hủy phiếu"
        destructive
        isPending={cancel.isPending}
        onConfirm={() => cancelTarget && cancel.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })}
        onClose={() => setCancelTarget(null)}
      />

      {printTarget && <BreakdownPrint report={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}

function BreakdownFormDialog({
  open, onClose, onSubmit, isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateBreakdownDto) => void
  isPending?: boolean
}) {
  const [machineId, setMachineId] = useState<number | ''>('')
  const [severity, setSeverity] = useState<BreakdownSeverity>('MEDIUM')
  const [symptom, setSymptom] = useState('')
  const [stoppedProduction, setStoppedProduction] = useState(false)
  const [images, setImages] = useState<UploadedFile[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const { data: machinesData } = useMachines({ pageSize: 500 })
  const machines = machinesData?.data ?? []

  if (!open) return null

  const reset = () => {
    setMachineId(''); setSeverity('MEDIUM'); setSymptom('')
    setStoppedProduction(false); setImages([]); setNote(''); setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Lập phiếu báo hỏng</h2>
          <button onClick={() => { reset(); onClose() }}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!machineId) { setError('Phải chọn máy'); return }
            if (!symptom.trim()) { setError('Phải mô tả hiện tượng hỏng'); return }
            onSubmit({
              machineId: Number(machineId),
              severity,
              symptom: symptom.trim(),
              stoppedProduction,
              imageUrls: images.map((i) => i.url),
              note: note.trim() || undefined,
            })
            reset()
          }}
          className="p-5 space-y-3"
        >
          <div>
            <label className="text-sm font-medium mb-1 block">Máy hỏng *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Chọn máy —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}{m.line ? ` (${m.line.name})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Mức độ nghiêm trọng</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value as BreakdownSeverity)}>
              {(Object.keys(SEVERITY_LABELS) as BreakdownSeverity[]).map((s) => (
                <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Hiện tượng hỏng *</label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="VD: Máy chạy được một lúc thì kêu to, kim bị lệch, không cắt chỉ tự động" />
          </div>

          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="stoppedProd" checked={stoppedProduction} onChange={(e) => setStoppedProduction(e.target.checked)} />
            <label className="form-check-label small" htmlFor="stoppedProd">Máy hỏng làm dừng sản xuất</label>
          </div>

          <FileUpload label="Ảnh hiện trạng" value={images} onChange={setImages} accept="image" max={6} />

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
