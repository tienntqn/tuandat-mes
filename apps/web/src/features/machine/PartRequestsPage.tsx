import { Fragment, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Check, Printer, PackageCheck, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  usePartRequests,
  useCreatePartRequest,
  useUpdatePartRequest,
  useSubmitPartRequest,
  useApprovePartRequest,
  useRejectPartRequest,
  useReceivePartRequest,
  useCancelPartRequest,
  useDeletePartRequest,
} from './part-request.hooks'
import { useSparePartsActive } from './catalog.hooks'
import { factoryApi } from '@/features/factory/factory.api'
import {
  PART_REQUEST_STATUS_LABELS,
  PART_REQUEST_STATUS_BADGE,
  type PartRequest,
  type PartRequestStatus,
  type CreatePartRequestDto,
  type PartRequestItemInput,
} from './part-request.api'
import { WORK_TYPE_LABELS, type WorkType } from './work-order.api'
import { PartRequestPrint } from './PartRequestPrint'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function PartRequestsPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'' | WorkType>('')
  const [statusFilter, setStatusFilter] = useState<'' | PartRequestStatus>('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PartRequest | null>(null)
  const [printTarget, setPrintTarget] = useState<PartRequest | null>(null)
  const [receiveTarget, setReceiveTarget] = useState<PartRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PartRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState<PartRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PartRequest | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  const canApprove = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  // Nhận dữ liệu điền sẵn khi người dùng bấm "Lập yêu cầu mua vật tư thiếu" từ nhu cầu vật tư của kế hoạch
  const location = useLocation()
  const preset = location.state as
    | { presetItems?: PartRequestItemInput[]; workPlanId?: number; type?: WorkType; title?: string }
    | null
  const [presetUsed, setPresetUsed] = useState(false)

  useEffect(() => {
    if (preset?.presetItems && preset.presetItems.length > 0 && !presetUsed) {
      setEditTarget(null)
      setFormOpen(true)
      setPresetUsed(true)
    }
  }, [preset, presetUsed])

  const { data, isLoading, refetch } = usePartRequests({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createRequest = useCreatePartRequest()
  const updateRequest = useUpdatePartRequest()
  const submitRequest = useSubmitPartRequest()
  const approveRequest = useApprovePartRequest()
  const rejectRequest = useRejectPartRequest()
  const receiveRequest = useReceivePartRequest()
  const cancelRequest = useCancelPartRequest()
  const deleteRequest = useDeletePartRequest()

  const toggleExpand = (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  return (
    <PageWrapper
      title="Yêu cầu mua vật tư"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Yêu cầu mua vật tư' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập yêu cầu
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Yêu cầu mua vật tư duyệt <strong>2 cấp</strong>: Cơ điện lập → Giám đốc xưởng duyệt →
        Công ty duyệt (khi vượt ngưỡng chi phí) → mua hàng về thì bấm <strong>Nhận hàng</strong> để nhập kho xưởng.
      </div>

      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as WorkType | ''); setPage(1) }}>
            <option value="">Tất cả loại</option>
            {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
              <option key={t} value={t}>Vật tư {WORK_TYPE_LABELS[t].toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as PartRequestStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(PART_REQUEST_STATUS_LABELS) as PartRequestStatus[]).map((s) => (
              <option key={s} value={s}>{PART_REQUEST_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số yêu cầu, nội dung..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} yêu cầu</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Số yêu cầu</th><th>Nội dung</th>
              <th className="text-center">Ngày YC</th><th className="text-center">Cần có</th>
              <th className="text-end">Thành tiền</th><th className="text-center">Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có yêu cầu mua vật tư nào</td></tr>
            ) : (
              data?.data.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <button onClick={() => toggleExpand(r.id)} className="btn btn-sm btn-link p-0">
                        {expanded.has(r.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td>
                      <code>{r.requestNo}</code>
                      <div className="small text-muted">{WORK_TYPE_LABELS[r.type]}</div>
                    </td>
                    <td>
                      <div className="fw-medium">{r.title}</div>
                      <div className="small text-muted">{r.factory?.name}</div>
                      {r.workPlan && <div className="small text-muted">Theo KH {r.workPlan.planNo}</div>}
                      {r.rejectReason && <div className="small text-danger">Từ chối: {r.rejectReason}</div>}
                    </td>
                    <td className="text-center small">{fmtDate(r.requestDate)}</td>
                    <td className="text-center small">{fmtDate(r.neededDate)}</td>
                    <td className="text-end small">{r.totalAmount != null ? Number(r.totalAmount).toLocaleString('vi-VN') : '—'}</td>
                    <td className="text-center">
                      <span className={`badge ${PART_REQUEST_STATUS_BADGE[r.status]}`}>{PART_REQUEST_STATUS_LABELS[r.status]}</span>
                      {r.factoryApprovedAt && <div className="small text-muted">Xưởng: {fmtDate(r.factoryApprovedAt)}</div>}
                      {r.companyApprovedAt && <div className="small text-muted">Công ty: {fmtDate(r.companyApprovedAt)}</div>}
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1 flex-wrap">
                        <button onClick={() => setPrintTarget(r)} className="btn btn-sm btn-outline-secondary" title="In yêu cầu"><Printer size={13} /></button>
                        {canWrite && (r.status === 'DRAFT' || r.status === 'REJECTED') && (
                          <>
                            <button onClick={() => { setEditTarget(r); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                            <button onClick={() => submitRequest.mutate(r.id)} disabled={submitRequest.isPending} className="btn btn-sm btn-primary text-white">
                              <Send size={13} /> Trình duyệt
                            </button>
                          </>
                        )}
                        {canApprove && (r.status === 'PENDING_FACTORY' || r.status === 'PENDING_COMPANY') && (
                          <>
                            <button onClick={() => approveRequest.mutate(r.id)} disabled={approveRequest.isPending} className="btn btn-sm btn-primary text-white">
                              <Check size={13} /> Duyệt
                            </button>
                            <button onClick={() => { setRejectTarget(r); setRejectReason('') }} className="btn btn-sm btn-outline-danger">Từ chối</button>
                          </>
                        )}
                        {canWrite && (r.status === 'APPROVED' || r.status === 'PURCHASED') && (
                          <button onClick={() => setReceiveTarget(r)} className="btn btn-sm btn-outline-primary">
                            <PackageCheck size={13} /> Nhận hàng
                          </button>
                        )}
                        {canWrite && r.status === 'DRAFT' && (
                          <button onClick={() => setDeleteTarget(r)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                        )}
                        {canApprove && r.status !== 'PURCHASED' && r.status !== 'CANCELLED' && r.status !== 'DRAFT' && (
                          <button onClick={() => setCancelTarget(r)} className="btn btn-sm btn-outline-danger">Hủy</button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expanded.has(r.id) && (
                    <tr>
                      <td colSpan={8} className="bg-light">
                        <div className="p-2">
                          <table className="table table-sm mb-0 bg-white">
                            <thead>
                              <tr>
                                <th style={{ width: 36 }}>#</th><th>Vật tư</th>
                                <th className="text-end" style={{ width: 90 }}>SL yêu cầu</th>
                                <th className="text-end" style={{ width: 90 }}>Tồn lúc YC</th>
                                <th className="text-end" style={{ width: 90 }}>Đã nhận</th>
                                <th className="text-end" style={{ width: 100 }}>Đơn giá</th>
                                <th className="text-end" style={{ width: 110 }}>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(r.items ?? []).map((it, idx) => (
                                <tr key={it.id}>
                                  <td>{idx + 1}</td>
                                  <td className="small">
                                    <span className="fw-medium">{it.sparePart?.code ?? ''}</span> {it.name}
                                    {!it.sparePartId && <span className="badge bg-secondary-transparent ms-1">Ngoài danh mục</span>}
                                  </td>
                                  <td className="text-end small">{Number(it.quantity)} {it.unit ?? ''}</td>
                                  <td className="text-end small text-muted">{it.stockQuantity != null ? Number(it.stockQuantity) : '—'}</td>
                                  <td className="text-end small">
                                    {Number(it.receivedQuantity)}
                                    {Number(it.receivedQuantity) >= Number(it.quantity) && <span className="text-success ms-1">✓</span>}
                                  </td>
                                  <td className="text-end small">{it.estimatedPrice != null ? Number(it.estimatedPrice).toLocaleString('vi-VN') : '—'}</td>
                                  <td className="text-end small">{it.amount != null ? Number(it.amount).toLocaleString('vi-VN') : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <PartRequestFormDialog
        open={formOpen}
        request={editTarget}
        preset={!editTarget && presetUsed ? preset ?? undefined : undefined}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={(dto) => {
          if (editTarget) {
            const { title, reason, requestDate, neededDate, note, items } = dto
            updateRequest.mutate(
              { id: editTarget.id, dto: { title, reason, requestDate, neededDate, note, items } },
              { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
            )
          } else {
            createRequest.mutate(dto, { onSuccess: () => setFormOpen(false) })
          }
        }}
        isPending={createRequest.isPending || updateRequest.isPending}
      />

      {receiveTarget && (
        <ReceiveDialog
          request={receiveTarget}
          onClose={() => setReceiveTarget(null)}
          isPending={receiveRequest.isPending}
          onSubmit={(dto) => receiveRequest.mutate({ id: receiveTarget.id, dto }, { onSuccess: () => setReceiveTarget(null) })}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-lg">Từ chối yêu cầu</h2>
              <button onClick={() => setRejectTarget(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="small text-muted">Yêu cầu {rejectTarget.requestNo}</div>
              <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Lý do từ chối *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejectTarget(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
                <button
                  disabled={!rejectReason.trim() || rejectRequest.isPending}
                  onClick={() => rejectRequest.mutate({ id: rejectTarget.id, rejectReason: rejectReason.trim() }, { onSuccess: () => setRejectTarget(null) })}
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
        open={!!cancelTarget}
        title="Hủy yêu cầu"
        description={`Hủy yêu cầu ${cancelTarget?.requestNo}?`}
        confirmLabel="Hủy yêu cầu"
        destructive
        isPending={cancelRequest.isPending}
        onConfirm={() => cancelTarget && cancelRequest.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })}
        onClose={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa yêu cầu"
        description={`Xóa yêu cầu ${deleteTarget?.requestNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteRequest.isPending}
        onConfirm={() => deleteTarget && deleteRequest.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />

      {printTarget && <PartRequestPrint request={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}

function PartRequestFormDialog({
  open, request, preset, onClose, onSubmit, isPending,
}: {
  open: boolean
  request?: PartRequest | null
  /** Dữ liệu điền sẵn khi lập yêu cầu từ nhu cầu vật tư của kế hoạch */
  preset?: { presetItems?: PartRequestItemInput[]; workPlanId?: number; type?: WorkType; title?: string }
  onClose: () => void
  onSubmit: (dto: CreatePartRequestDto) => void
  isPending?: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<WorkType>('MAINTENANCE')
  const [factoryId, setFactoryId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [requestDate, setRequestDate] = useState(today)
  const [neededDate, setNeededDate] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<PartRequestItemInput[]>([])
  const [error, setError] = useState('')

  const { user } = useAuthStore()
  const isCompanyLevel = !user?.factoryId
  const { data: spareParts = [] } = useSparePartsActive()
  const { data: factories } = useQuery({
    queryKey: ['factories-all'],
    queryFn: () => factoryApi.list({ pageSize: 100 }),
    enabled: open && isCompanyLevel,
  })

  // Nạp lại dữ liệu mỗi lần mở form (sửa: lấy từ yêu cầu hiện có; tạo mới: về mặc định)
  useEffect(() => {
    if (!open) return
    setError('')
    if (request) {
      setType(request.type)
      setFactoryId(request.factoryId)
      setTitle(request.title)
      setReason(request.reason ?? '')
      setRequestDate(request.requestDate.slice(0, 10))
      setNeededDate(request.neededDate?.slice(0, 10) ?? '')
      setNote(request.note ?? '')
      setItems((request.items ?? []).map((i) => ({
        sparePartId: i.sparePartId ?? undefined,
        name: i.name,
        unit: i.unit ?? undefined,
        quantity: Number(i.quantity),
        estimatedPrice: i.estimatedPrice != null ? Number(i.estimatedPrice) : undefined,
        note: i.note ?? undefined,
      })))
    } else {
      setType(preset?.type ?? 'MAINTENANCE')
      setFactoryId('')
      setTitle(preset?.title ?? '')
      setReason('')
      setRequestDate(new Date().toISOString().slice(0, 10))
      setNeededDate('')
      setNote('')
      setItems(preset?.presetItems ?? [])
    }
  }, [open, request, preset])

  if (!open) return null

  const addItem = () => setItems([...items, { name: '', quantity: 1 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<PartRequestItemInput>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const pickSparePart = (idx: number, id: string) => {
    if (!id) { updateItem(idx, { sparePartId: undefined }); return }
    const sp = spareParts.find((s) => s.id === Number(id))
    updateItem(idx, { sparePartId: Number(id), name: sp?.name ?? items[idx].name, unit: sp?.unit ?? items[idx].unit })
  }

  const total = items.reduce((sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">{request ? `Sửa yêu cầu ${request.requestNo}` : 'Lập yêu cầu mua vật tư'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) { setError('Tiêu đề không được để trống'); return }
            if (isCompanyLevel && !request && !factoryId) { setError('Phải chọn xưởng'); return }
            const cleanItems = items.filter((i) => i.name.trim() && i.quantity > 0)
            if (cleanItems.length === 0) { setError('Phải có ít nhất một dòng vật tư'); return }
            onSubmit({
              type,
              factoryId: factoryId ? Number(factoryId) : undefined,
              title: title.trim(),
              workPlanId: preset?.workPlanId,
              reason: reason.trim() || undefined,
              requestDate,
              neededDate: neededDate || undefined,
              note: note.trim() || undefined,
              items: cleanItems,
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="d-flex gap-2 flex-wrap">
            <div style={{ width: 180 }}>
              <label className="text-sm font-medium mb-1 block">Vật tư cho *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as WorkType)} disabled={!!request}>
                {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
                  <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {isCompanyLevel && (
              <div style={{ width: 200 }}>
                <label className="text-sm font-medium mb-1 block">Xưởng *</label>
                <select className="w-full rounded-lg border px-3 py-2 text-sm" value={factoryId} onChange={(e) => setFactoryId(e.target.value ? Number(e.target.value) : '')} disabled={!!request}>
                  <option value="">— Chọn xưởng —</option>
                  {factories?.data.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-fill" style={{ minWidth: 220 }}>
              <label className="text-sm font-medium mb-1 block">Tiêu đề *</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Mua vật tư bảo dưỡng quý III" />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Ngày yêu cầu *</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Ngày cần có</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Lý do</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-sm font-medium">Danh sách vật tư *</label>
              <button type="button" onClick={addItem} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                <Plus size={14} /> Thêm dòng
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-muted small border rounded-lg p-3 text-center">Chưa có vật tư nào</div>
            ) : (
              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '28%' }}>Phụ tùng</th><th>Tên</th>
                      <th style={{ width: 80 }}>SL</th><th style={{ width: 70 }}>ĐVT</th>
                      <th style={{ width: 120 }}>Đơn giá DK</th><th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="form-select form-select-sm" value={it.sparePartId ?? ''} onChange={(e) => pickSparePart(idx, e.target.value)}>
                            <option value="">— Nhập tay —</option>
                            {spareParts.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                          </select>
                        </td>
                        <td><input className="form-control form-control-sm" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} /></td>
                        <td><input type="number" min={0} step="0.1" className="form-control form-control-sm" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} /></td>
                        <td><input className="form-control form-control-sm" value={it.unit ?? ''} onChange={(e) => updateItem(idx, { unit: e.target.value })} /></td>
                        <td><input type="number" min={0} className="form-control form-control-sm" value={it.estimatedPrice ?? ''} onChange={(e) => updateItem(idx, { estimatedPrice: e.target.value ? Number(e.target.value) : undefined })} /></td>
                        <td className="text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="btn btn-sm btn-outline-danger px-2"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > 0 && <div className="text-end small mt-1">Tổng tiền dự kiến: <strong>{total.toLocaleString('vi-VN')} đ</strong></div>}
            <div className="small text-muted mt-1">
              Chỉ vật tư chọn từ danh mục phụ tùng mới được ghi vào tồn kho khi nhận hàng.
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : request ? 'Cập nhật' : 'Lập yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Nhận hàng theo yêu cầu đã duyệt — nhập số lượng thực nhận cho từng dòng còn thiếu. */
function ReceiveDialog({
  request, onClose, onSubmit, isPending,
}: {
  request: PartRequest
  onClose: () => void
  onSubmit: (dto: { items: { itemId: number; quantity: number; unitPrice?: number }[]; supplier?: string; documentNo?: string; note?: string }) => void
  isPending?: boolean
}) {
  const pending = (request.items ?? []).filter((i) => Number(i.receivedQuantity) < Number(i.quantity))
  const [lines, setLines] = useState<Record<number, { quantity: string; unitPrice: string }>>(
    Object.fromEntries(
      pending.map((i) => [
        i.id,
        {
          quantity: String(Number(i.quantity) - Number(i.receivedQuantity)),
          unitPrice: i.estimatedPrice != null ? String(Number(i.estimatedPrice)) : '',
        },
      ]),
    ),
  )
  const [supplier, setSupplier] = useState('')
  const [documentNo, setDocumentNo] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Nhận hàng — {request.requestNo}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const items = Object.entries(lines)
              .map(([itemId, v]) => ({
                itemId: Number(itemId),
                quantity: Number(v.quantity || 0),
                unitPrice: v.unitPrice ? Number(v.unitPrice) : undefined,
              }))
              .filter((i) => i.quantity > 0)
            if (items.length === 0) { setError('Phải nhập số lượng nhận cho ít nhất một dòng'); return }
            onSubmit({
              items,
              supplier: supplier.trim() || undefined,
              documentNo: documentNo.trim() || undefined,
              note: note.trim() || undefined,
            })
          }}
          className="p-5 space-y-3"
        >
          {pending.length === 0 ? (
            <div className="alert alert-success small mb-0">Tất cả vật tư của yêu cầu này đã được nhận đủ.</div>
          ) : (
            <>
              <div className="alert alert-info small">
                Số lượng nhận sẽ được <strong>cộng vào tồn kho xưởng</strong> ngay khi lưu.
              </div>

              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>Vật tư</th>
                      <th className="text-end" style={{ width: 90 }}>Còn thiếu</th>
                      <th style={{ width: 110 }}>Nhận lần này</th>
                      <th style={{ width: 120 }}>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((it) => (
                      <tr key={it.id}>
                        <td className="small">
                          <div className="fw-medium">{it.name}</div>
                          {!it.sparePartId && <span className="badge bg-secondary-transparent">Không vào kho</span>}
                        </td>
                        <td className="text-end small">{Number(it.quantity) - Number(it.receivedQuantity)} {it.unit ?? ''}</td>
                        <td>
                          <input
                            type="number" min={0} step="0.1" className="form-control form-control-sm"
                            value={lines[it.id]?.quantity ?? ''}
                            onChange={(e) => setLines({ ...lines, [it.id]: { ...lines[it.id], quantity: e.target.value } })}
                          />
                        </td>
                        <td>
                          <input
                            type="number" min={0} className="form-control form-control-sm"
                            value={lines[it.id]?.unitPrice ?? ''}
                            onChange={(e) => setLines({ ...lines, [it.id]: { ...lines[it.id], unitPrice: e.target.value } })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex gap-2">
                <div className="flex-fill">
                  <label className="text-sm font-medium mb-1 block">Nhà cung cấp</label>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                </div>
                <div className="flex-fill">
                  <label className="text-sm font-medium mb-1 block">Số hóa đơn / phiếu nhập</label>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Ghi chú</label>
                <input className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Đóng</button>
            {pending.length > 0 && (
              <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                {isPending ? 'Đang lưu...' : 'Nhập kho'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
