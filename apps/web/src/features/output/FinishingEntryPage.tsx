import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, RefreshCw, CheckCircle2, Package } from 'lucide-react'
import { useFinishingPos, useFinishingToday, useUpsertFinishing } from './output.hooks'
import type { FinishingPo } from './output.api'

interface RowState { received: string; packed: string; saved: boolean }

// Màn nhập sản lượng Tổ Hoàn thành — theo PO: số đã nhận từ chuyền may + số đã đóng thùng.
export default function FinishingEntryPage() {
  const { data: pos = [], isLoading: posLoading } = useFinishingPos()
  const { data: today, isLoading: todayLoading, refetch } = useFinishingToday()
  const upsert = useUpsertFinishing()

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19
  const outputs = today?.outputs ?? []

  const [rows, setRows] = useState<Record<number, RowState>>({})

  // Khởi tạo giá trị từ sản lượng hôm nay
  useEffect(() => {
    const init: Record<number, RowState> = {}
    for (const p of pos) {
      const existing = outputs.find((o) => o.poId === p.id)
      init[p.id] = {
        received: existing ? String(existing.receivedQuantity) : '',
        packed: existing ? String(existing.packedQuantity) : '',
        saved: false,
      }
    }
    setRows(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.length, JSON.stringify(outputs.map((o) => [o.poId, o.receivedQuantity, o.packedQuantity]))])

  const setField = (poId: number, field: 'received' | 'packed', val: string) =>
    setRows((r) => ({ ...r, [poId]: { ...r[poId], [field]: val.replace(/[^\d]/g, ''), saved: false } }))

  const rowError = (po: FinishingPo, row: RowState): string | null => {
    const received = parseInt(row.received || '0') || 0
    const packed = parseInt(row.packed || '0') || 0
    if (packed > received) return 'Đã đóng thùng không được lớn hơn đã nhận'
    if (received > po.totalQuantity) return `Vượt tổng PO (${po.totalQuantity.toLocaleString()})`
    return null
  }

  const handleSave = async (po: FinishingPo) => {
    const row = rows[po.id]
    if (!row) return
    if (rowError(po, row)) return
    await upsert.mutateAsync({
      poId: po.id,
      receivedQuantity: parseInt(row.received || '0') || 0,
      packedQuantity: parseInt(row.packed || '0') || 0,
    })
    await refetch()
    setRows((r) => ({ ...r, [po.id]: { ...r[po.id], saved: true } }))
    setTimeout(() => setRows((r) => (r[po.id] ? { ...r, [po.id]: { ...r[po.id], saved: false } } : r)), 2000)
  }

  if (posLoading || todayLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
        <div style={{ padding: 16 }}>
          <div className="card mb-3"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2" style={{ height: 20 }}></span><span className="placeholder col-12" style={{ height: 60 }}></span></div></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      <div className="sticky-top bg-white border-bottom px-3 py-2">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h5 className="fw-bold mb-0">Nhập sản lượng Hoàn thành</h5>
            {today && <small className="text-muted">{new Date(today.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}</small>}
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()}><RefreshCw size={14} /></button>
        </div>
      </div>

      <div style={{ padding: '12px 12px 0' }}>
        {isPastCutoff && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="small">Đã qua giờ khóa {cutoffHour}:00 — không thể nhập sản lượng hôm nay</span>
          </div>
        )}
        {!isPastCutoff && (cutoffHour - new Date().getHours()) <= 1 && (
          <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3">
            <Clock size={18} className="flex-shrink-0" />
            <span className="small">Còn ít hơn 1 giờ đến giờ khóa ({cutoffHour}:00)</span>
          </div>
        )}

        {pos.length === 0 ? (
          <div className="card mb-3"><div className="card-body text-center text-muted py-5"><p className="mb-0">Xưởng chưa có PO nào đang sản xuất</p></div></div>
        ) : (
          pos.map((po) => {
            const row = rows[po.id] ?? { received: '', packed: '', saved: false }
            const error = rowError(po, row)
            return (
              <div key={po.id} className="card mb-3">
                <div className="card-header py-2 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold small"><Package size={13} className="me-1" />{po.poNumber}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{po.style?.code} — {po.style?.name}</div>
                  </div>
                  <span className="badge bg-light text-dark border">Tổng PO: {po.totalQuantity.toLocaleString()}</span>
                </div>
                <div className="card-body py-3">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1">Đã nhận từ chuyền may</label>
                      <input type="number" inputMode="numeric" min={0} disabled={isPastCutoff}
                        className="form-control text-center" style={{ fontSize: '1.1rem' }}
                        value={row.received}
                        onChange={(e) => setField(po.id, 'received', e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1">Đã đóng thùng</label>
                      <input type="number" inputMode="numeric" min={0} disabled={isPastCutoff}
                        className="form-control text-center" style={{ fontSize: '1.1rem' }}
                        value={row.packed}
                        onChange={(e) => setField(po.id, 'packed', e.target.value)} />
                    </div>
                  </div>
                  {error && <div className="text-danger small mt-2"><AlertTriangle size={12} className="me-1" />{error}</div>}
                  {!isPastCutoff && (
                    <button className="btn btn-primary w-100 mt-3" disabled={upsert.isPending || !!error} onClick={() => handleSave(po)}>
                      {row.saved ? <span className="d-flex align-items-center justify-content-center gap-1"><CheckCircle2 size={16} /> Đã lưu</span> : upsert.isPending ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
