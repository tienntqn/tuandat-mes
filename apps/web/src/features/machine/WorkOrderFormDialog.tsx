import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useMachines } from './machine.hooks'
import { useSparePartsActive } from './catalog.hooks'
import { useTransferFormOptions } from './machine.hooks'
import { WORK_TYPE_LABELS, type CreateWorkOrderDto, type WorkOrderPartInput, type WorkType, type WorkOrder } from './work-order.api'

interface Props {
  open: boolean
  order?: WorkOrder | null
  defaultType?: WorkType
  defaultMachineId?: number
  defaultContent?: string
  breakdownReportId?: number
  maintenanceRequestId?: number
  planItemId?: number
  onClose: () => void
  onSubmit: (dto: CreateWorkOrderDto) => void
  isPending?: boolean
}

/** Form lập phiếu sửa chữa / bảo dưỡng — dùng chung cho cả hai luồng. */
export function WorkOrderFormDialog({
  open, order, defaultType = 'REPAIR', defaultMachineId, defaultContent,
  breakdownReportId, maintenanceRequestId, planItemId,
  onClose, onSubmit, isPending,
}: Props) {
  const [type, setType] = useState<WorkType>(defaultType)
  const [machineId, setMachineId] = useState<number | ''>('')
  const [content, setContent] = useState('')
  const [performedBy, setPerformedBy] = useState<number | ''>('')
  const [assistants, setAssistants] = useState('')
  const [findings, setFindings] = useState('')
  const [parts, setParts] = useState<WorkOrderPartInput[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const { data: machinesData } = useMachines({ pageSize: 500 })
  const machines = machinesData?.data ?? []
  const { data: spareParts = [] } = useSparePartsActive()
  const { data: options } = useTransferFormOptions()

  useEffect(() => {
    if (!open) return
    setError('')
    if (order) {
      setType(order.type)
      setMachineId(order.machineId)
      setContent(order.content)
      setPerformedBy(order.performedBy)
      setAssistants(order.assistants ?? '')
      setFindings(order.findings ?? '')
      setNote(order.note ?? '')
      setParts((order.parts ?? []).map((p) => ({
        sparePartId: p.sparePartId ?? undefined,
        name: p.name,
        unit: p.unit ?? undefined,
        quantity: Number(p.quantity),
        unitPrice: p.unitPrice != null ? Number(p.unitPrice) : undefined,
        fromStock: p.fromStock,
        note: p.note ?? undefined,
      })))
    } else {
      setType(defaultType)
      setMachineId(defaultMachineId ?? '')
      setContent(defaultContent ?? '')
      setPerformedBy(''); setAssistants(''); setFindings(''); setNote(''); setParts([])
    }
  }, [open, order, defaultType, defaultMachineId, defaultContent])

  if (!open) return null

  const addPart = () => setParts([...parts, { name: '', quantity: 1, fromStock: true }])
  const removePart = (idx: number) => setParts(parts.filter((_, i) => i !== idx))
  const updatePart = (idx: number, patch: Partial<WorkOrderPartInput>) =>
    setParts(parts.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  const pickSparePart = (idx: number, id: string) => {
    if (!id) { updatePart(idx, { sparePartId: undefined }); return }
    const sp = spareParts.find((s) => s.id === Number(id))
    updatePart(idx, { sparePartId: Number(id), name: sp?.name ?? parts[idx].name, unit: sp?.unit ?? parts[idx].unit })
  }

  const totalParts = parts.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">
            {order ? `Sửa phiếu ${order.orderNo}` : `Lập phiếu ${WORK_TYPE_LABELS[type].toLowerCase()}`}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!machineId) { setError('Phải chọn máy'); return }
            if (!content.trim()) { setError('Phải nhập nội dung công việc'); return }
            onSubmit({
              type,
              machineId: Number(machineId),
              breakdownReportId,
              maintenanceRequestId,
              planItemId,
              content: content.trim(),
              performedBy: performedBy ? Number(performedBy) : undefined,
              assistants: assistants.trim() || undefined,
              findings: findings.trim() || undefined,
              note: note.trim() || undefined,
              parts: parts.filter((p) => p.name.trim() && p.quantity > 0),
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="d-flex gap-2">
            <div style={{ width: 180 }}>
              <label className="text-sm font-medium mb-1 block">Loại phiếu *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as WorkType)} disabled={!!order || !!breakdownReportId || !!maintenanceRequestId}>
                {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
                  <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Máy *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : '')} disabled={!!defaultMachineId || !!order}>
                <option value="">— Chọn máy —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Nội dung công việc *</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: Thay bo mạch điều khiển, hiệu chỉnh lại kim" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tình trạng phát hiện khi kiểm tra</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={findings} onChange={(e) => setFindings(e.target.value)} />
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Cơ điện phụ trách</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={performedBy} onChange={(e) => setPerformedBy(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— Mặc định là người lập phiếu —</option>
                {options?.people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Người phối hợp</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={assistants} onChange={(e) => setAssistants(e.target.value)} />
            </div>
          </div>

          {/* Vật tư dự kiến — có thể sửa lại lúc hoàn thành phiếu */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-sm font-medium">Vật tư, phụ tùng sử dụng</label>
              <button type="button" onClick={addPart} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                <Plus size={14} /> Thêm vật tư
              </button>
            </div>
            {parts.length === 0 ? (
              <div className="text-muted small border rounded-lg p-3 text-center">Chưa khai vật tư</div>
            ) : (
              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '26%' }}>Phụ tùng</th><th>Tên</th>
                      <th style={{ width: 80 }}>SL</th><th style={{ width: 70 }}>ĐVT</th>
                      <th style={{ width: 110 }}>Đơn giá</th><th style={{ width: 80 }}>Từ kho</th><th style={{ width: 40 }}></th>
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
                          <input type="checkbox" className="form-check-input" checked={p.fromStock ?? true} onChange={(e) => updatePart(idx, { fromStock: e.target.checked })} title="Xuất từ kho xưởng" />
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
            {totalParts > 0 && (
              <div className="text-end small text-muted mt-1">Tạm tính tiền vật tư: <strong>{totalParts.toLocaleString('vi-VN')} đ</strong></div>
            )}
            <div className="small text-muted mt-1">
              Đánh dấu "Từ kho" để hệ thống trừ tồn kho xưởng khi hoàn thành phiếu (chỉ áp dụng cho phụ tùng chọn từ danh mục).
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
              {isPending ? 'Đang lưu...' : order ? 'Cập nhật' : 'Lập phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
