import { useState } from 'react'
import { X, Play, Check, Printer, FileText, Plus, Trash2 } from 'lucide-react'
import {
  useWorkOrders,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCancelWorkOrder,
  useDeleteWorkOrder,
} from './mmtb-ops.hooks'
import { useCreateHandover } from './mmtb.hooks'
import { useSparePartsActive } from './catalog.hooks'
import {
  WORK_TYPE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_BADGE,
  type WorkOrder,
  type WorkType,
  type WorkOrderStatus,
  type CompleteWorkOrderDto,
  type WorkOrderPartInput,
} from './work-order.api'
import { WorkOrderFormDialog } from './WorkOrderFormDialog'
import { WorkOrderPrint } from './WorkOrderPrint'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/**
 * Trang phiếu sửa chữa / bảo dưỡng MMTB.
 * Dùng chung cho cả hai luồng, lọc theo `defaultType` khi mở từ menu tương ứng.
 */
export default function WorkOrdersPage({ defaultType }: { defaultType?: WorkType } = {}) {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'' | WorkType>(defaultType ?? '')
  const [statusFilter, setStatusFilter] = useState<'' | WorkOrderStatus>('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null)
  const [completeTarget, setCompleteTarget] = useState<WorkOrder | null>(null)
  const [printTarget, setPrintTarget] = useState<WorkOrder | null>(null)
  const [cancelTarget, setCancelTarget] = useState<WorkOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null)
  const [handoverTarget, setHandoverTarget] = useState<WorkOrder | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useWorkOrders({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createOrder = useCreateWorkOrder()
  const updateOrder = useUpdateWorkOrder()
  const startOrder = useStartWorkOrder()
  const completeOrder = useCompleteWorkOrder()
  const cancelOrder = useCancelWorkOrder()
  const deleteOrder = useDeleteWorkOrder()
  const createHandover = useCreateHandover()

  const title = defaultType ? `Phiếu ${WORK_TYPE_LABELS[defaultType].toLowerCase()} MMTB` : 'Phiếu sửa chữa / bảo dưỡng'

  return (
    <PageWrapper
      title={title}
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: title }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập phiếu
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Quy trình: <strong>Lập phiếu</strong> → <strong>Bắt đầu</strong> (máy chuyển sang trạng thái đang sửa chữa/bảo dưỡng)
        → <strong>Hoàn thành</strong> (chốt vật tư, trừ kho, tính chi phí) → <strong>Lập biên bản bàn giao</strong> để máy trở lại sản xuất.
      </div>

      <div className="row g-2 mb-3">
        {!defaultType && (
          <div className="col-auto">
            <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as WorkType | ''); setPage(1) }}>
              <option value="">Tất cả loại phiếu</option>
              {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
                <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as WorkOrderStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
              <option key={s} value={s}>{WORK_ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số phiếu, mã máy, nội dung..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} phiếu</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Số phiếu</th><th>Máy</th><th>Nội dung</th>
              <th className="text-center">Thời gian</th><th className="text-end">Chi phí</th>
              <th className="text-center">Trạng thái</th><th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có phiếu nào</td></tr>
            ) : (
              data?.data.map((o) => (
                <tr key={o.id}>
                  <td>
                    <code>{o.orderNo}</code>
                    <div className="small text-muted">{WORK_TYPE_LABELS[o.type]}</div>
                  </td>
                  <td>
                    <div className="fw-medium">{o.machine?.code}</div>
                    <div className="small text-muted">{o.machine?.name}</div>
                  </td>
                  <td style={{ maxWidth: 250 }}>
                    <div className="small">{o.content}</div>
                    {o.breakdownReport && <div className="small text-muted">Từ báo hỏng {o.breakdownReport.reportNo}</div>}
                    {o.planItem && <div className="small text-muted">Theo KH {o.planItem.plan.planNo}</div>}
                    {o.handover && <div className="small text-muted">Biên bản BG: {o.handover.handoverNo}</div>}
                  </td>
                  <td className="text-center small">{fmtDate(o.startedAt)}<br />{fmtDate(o.finishedAt)}</td>
                  <td className="text-end small">{o.totalCost != null ? Number(o.totalCost).toLocaleString('vi-VN') : '—'}</td>
                  <td className="text-center"><span className={`badge ${WORK_ORDER_STATUS_BADGE[o.status]}`}>{WORK_ORDER_STATUS_LABELS[o.status]}</span></td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1 flex-wrap">
                      <button onClick={() => setPrintTarget(o)} className="btn btn-sm btn-outline-secondary" title="In phiếu"><Printer size={13} /></button>
                      {canWrite && o.status === 'DRAFT' && (
                        <>
                          <button onClick={() => { setEditTarget(o); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                          <button onClick={() => startOrder.mutate(o.id)} disabled={startOrder.isPending} className="btn btn-sm btn-primary text-white">
                            <Play size={13} /> Bắt đầu
                          </button>
                          <button onClick={() => setDeleteTarget(o)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                        </>
                      )}
                      {canWrite && o.status === 'IN_PROGRESS' && (
                        <>
                          <button onClick={() => setCompleteTarget(o)} className="btn btn-sm btn-primary text-white"><Check size={13} /> Hoàn thành</button>
                          <button onClick={() => setCancelTarget(o)} className="btn btn-sm btn-outline-danger">Hủy</button>
                        </>
                      )}
                      {canWrite && o.status === 'DONE' && !o.handover && (
                        <button onClick={() => setHandoverTarget(o)} className="btn btn-sm btn-outline-primary">
                          <FileText size={13} /> Lập biên bản BG
                        </button>
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

      <WorkOrderFormDialog
        open={formOpen}
        order={editTarget}
        defaultType={defaultType ?? 'REPAIR'}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={(dto) => {
          if (editTarget) {
            const { content, performedBy, assistants, findings, note, parts } = dto
            updateOrder.mutate(
              { id: editTarget.id, dto: { content, performedBy, assistants, findings, note, parts } },
              { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
            )
          } else {
            createOrder.mutate(dto, { onSuccess: () => setFormOpen(false) })
          }
        }}
        isPending={createOrder.isPending || updateOrder.isPending}
      />

      {completeTarget && (
        <CompleteWorkOrderDialog
          order={completeTarget}
          onClose={() => setCompleteTarget(null)}
          isPending={completeOrder.isPending}
          onSubmit={(dto) => completeOrder.mutate({ id: completeTarget.id, dto }, { onSuccess: () => setCompleteTarget(null) })}
        />
      )}

      {/* Tạo nhanh biên bản bàn giao sau sửa chữa / bảo dưỡng từ phiếu đã xong */}
      <ConfirmDialog
        open={!!handoverTarget}
        title="Lập biên bản bàn giao"
        description={`Tạo biên bản bàn giao ${handoverTarget?.type === 'REPAIR' ? 'sau sửa chữa' : 'sau bảo dưỡng'} cho phiếu ${handoverTarget?.orderNo}? Biên bản sẽ ở trạng thái Nháp để hai bên ký.`}
        confirmLabel="Tạo biên bản"
        isPending={createHandover.isPending}
        onConfirm={() => {
          if (!handoverTarget) return
          createHandover.mutate(
            {
              type: handoverTarget.type === 'REPAIR' ? 'AFTER_REPAIR' : 'AFTER_MAINTENANCE',
              machineId: handoverTarget.machineId,
              workOrderId: handoverTarget.id,
              handoverDate: new Date().toISOString().slice(0, 10),
              condition: handoverTarget.result ?? undefined,
            },
            { onSuccess: () => setHandoverTarget(null) },
          )
        }}
        onClose={() => setHandoverTarget(null)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Hủy phiếu"
        description={`Hủy phiếu ${cancelTarget?.orderNo}?`}
        confirmLabel="Hủy phiếu"
        destructive
        isPending={cancelOrder.isPending}
        onConfirm={() => cancelTarget && cancelOrder.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })}
        onClose={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa phiếu"
        description={`Xóa phiếu ${deleteTarget?.orderNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteOrder.isPending}
        onConfirm={() => deleteTarget && deleteOrder.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />

      {printTarget && <WorkOrderPrint order={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}

/** Hộp thoại hoàn thành phiếu: chốt vật tư đã dùng, ghi kết quả và chi phí. */
function CompleteWorkOrderDialog({
  order, onClose, onSubmit, isPending,
}: {
  order: WorkOrder
  onClose: () => void
  onSubmit: (dto: CompleteWorkOrderDto) => void
  isPending?: boolean
}) {
  const [result, setResult] = useState('')
  const [finishedAt, setFinishedAt] = useState(new Date().toISOString().slice(0, 10))
  const [downtimeHours, setDowntimeHours] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [error, setError] = useState('')
  const [parts, setParts] = useState<WorkOrderPartInput[]>(
    (order.parts ?? []).map((p) => ({
      sparePartId: p.sparePartId ?? undefined,
      name: p.name,
      unit: p.unit ?? undefined,
      quantity: Number(p.quantity),
      unitPrice: p.unitPrice != null ? Number(p.unitPrice) : undefined,
      fromStock: p.fromStock,
      note: p.note ?? undefined,
    })),
  )

  const { data: spareParts = [] } = useSparePartsActive()

  const addPart = () => setParts([...parts, { name: '', quantity: 1, fromStock: true }])
  const removePart = (idx: number) => setParts(parts.filter((_, i) => i !== idx))
  const updatePart = (idx: number, patch: Partial<WorkOrderPartInput>) =>
    setParts(parts.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  const pickSparePart = (idx: number, id: string) => {
    if (!id) { updatePart(idx, { sparePartId: undefined }); return }
    const sp = spareParts.find((s) => s.id === Number(id))
    updatePart(idx, { sparePartId: Number(id), name: sp?.name ?? parts[idx].name, unit: sp?.unit ?? parts[idx].unit })
  }

  const partsTotal = parts.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantity, 0)
  const total = partsTotal + (laborCost ? Number(laborCost) : 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Hoàn thành phiếu {order.orderNo}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!result.trim()) { setError('Phải ghi kết quả thực hiện'); return }
            onSubmit({
              result: result.trim(),
              finishedAt,
              downtimeHours: downtimeHours ? Number(downtimeHours) : undefined,
              laborCost: laborCost ? Number(laborCost) : undefined,
              nextDueDate: nextDueDate || undefined,
              parts: parts.filter((p) => p.name.trim() && p.quantity > 0),
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="alert alert-warning small mb-2">
            Khi hoàn thành, các vật tư đánh dấu "Từ kho" sẽ bị <strong>trừ khỏi tồn kho xưởng</strong>. Kiểm tra kỹ trước khi lưu.
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Kết quả thực hiện *</label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" value={result} onChange={(e) => setResult(e.target.value)} placeholder="VD: Đã thay bo mạch, chạy thử 30 phút ổn định" />
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Ngày hoàn thành</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Số giờ máy dừng</label>
              <input type="number" min={0} step="0.5" className="w-full rounded-lg border px-3 py-2 text-sm" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Chi phí nhân công (đ)</label>
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Hạn bảo dưỡng kế tiếp</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-sm font-medium">Vật tư thực dùng</label>
              <button type="button" onClick={addPart} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                <Plus size={14} /> Thêm
              </button>
            </div>
            {parts.length === 0 ? (
              <div className="text-muted small border rounded-lg p-3 text-center">Không dùng vật tư</div>
            ) : (
              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '26%' }}>Phụ tùng</th><th>Tên</th>
                      <th style={{ width: 80 }}>SL</th><th style={{ width: 65 }}>ĐVT</th>
                      <th style={{ width: 110 }}>Đơn giá</th><th style={{ width: 70 }}>Từ kho</th><th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="form-select form-select-sm" value={p.sparePartId ?? ''} onChange={(e) => pickSparePart(idx, e.target.value)}>
                            <option value="">— Nhập tay —</option>
                            {spareParts.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                          </select>
                        </td>
                        <td><input className="form-control form-control-sm" value={p.name} onChange={(e) => updatePart(idx, { name: e.target.value })} /></td>
                        <td><input type="number" min={0} step="0.1" className="form-control form-control-sm" value={p.quantity} onChange={(e) => updatePart(idx, { quantity: Number(e.target.value) })} /></td>
                        <td><input className="form-control form-control-sm" value={p.unit ?? ''} onChange={(e) => updatePart(idx, { unit: e.target.value })} /></td>
                        <td><input type="number" min={0} className="form-control form-control-sm" value={p.unitPrice ?? ''} onChange={(e) => updatePart(idx, { unitPrice: e.target.value ? Number(e.target.value) : undefined })} /></td>
                        <td className="text-center">
                          <input type="checkbox" className="form-check-input" checked={p.fromStock ?? true} onChange={(e) => updatePart(idx, { fromStock: e.target.checked })} />
                        </td>
                        <td className="text-center">
                          <button type="button" onClick={() => removePart(idx)} className="btn btn-sm btn-outline-danger px-2"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-end small mt-1">
              Vật tư: <strong>{partsTotal.toLocaleString('vi-VN')} đ</strong> · Tổng chi phí: <strong>{total.toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : 'Hoàn thành phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
