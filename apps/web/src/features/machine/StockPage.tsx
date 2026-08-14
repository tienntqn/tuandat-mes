import { useState } from 'react'
import { X, PackagePlus, ClipboardCheck, History, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  useStocks,
  useStockMovements,
  useReceiveStock,
  useAdjustStock,
  useSetMinQuantity,
} from './mmtb-ops.hooks'
import { useSparePartsActive } from './catalog.hooks'
import { factoryApi } from '@/features/factory/factory.api'
import { MOVEMENT_TYPE_LABELS, type SparePartStock, type StockMovementType } from './stock.api'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { useAuthStore } from '@/stores/auth.store'

const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('vi-VN') : '—')
const fmtNum = (n: number) => Number(n).toLocaleString('vi-VN')

const MOVEMENT_BADGE: Record<StockMovementType, string> = {
  IN: 'bg-success-transparent',
  OUT: 'bg-danger-transparent',
  ADJUST: 'bg-warning-transparent',
}

/** Tồn kho phụ tùng theo xưởng: xem tồn, nhập kho, kiểm kê và tra thẻ kho. */
export default function StockPage() {
  const [tab, setTab] = useState<'stock' | 'movements'>('stock')
  const [search, setSearch] = useState('')
  const [belowMin, setBelowMin] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<SparePartStock | null>(null)
  const [minTarget, setMinTarget] = useState<SparePartStock | null>(null)
  const [movementPage, setMovementPage] = useState(1)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data: stocks = [], isLoading, refetch } = useStocks({
    search: search || undefined,
    belowMin: belowMin || undefined,
  })
  const { data: movements } = useStockMovements({ page: movementPage, pageSize: 20 })

  const belowMinCount = stocks.filter((s) => s.isBelowMin).length

  const exportRows = () =>
    stocks.map((s) => ({
      'Mã phụ tùng': s.sparePart?.code ?? '',
      'Tên phụ tùng': s.sparePart?.name ?? '',
      'Xưởng': s.factory?.name ?? '',
      'Tồn kho': Number(s.quantity),
      'ĐVT': s.sparePart?.unit ?? '',
      'Tồn tối thiểu': Number(s.minQuantity),
      'Vị trí': s.location ?? '',
    }))

  return (
    <PageWrapper
      title="Tồn kho phụ tùng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Tồn kho phụ tùng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Tồn kho" fileBase="ton-kho-phu-tung" exportRows={exportRows} templateRows={exportRows()} canWrite={false} entityLabel="dòng tồn kho" />
          {canWrite && (
            <button onClick={() => setReceiveOpen(true)} className="btn btn-primary btn-icon text-white">
              <span><PackagePlus size={15} /></span> Nhập kho
            </button>
          )}
        </div>
      }
    >
      {belowMinCount > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> Có <strong>{belowMinCount}</strong> phụ tùng đang dưới định mức tồn tối thiểu.
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Tồn kho</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>
            <History size={14} /> Thẻ kho
          </button>
        </li>
      </ul>

      {tab === 'stock' ? (
        <>
          <div className="row g-2 mb-3">
            <div className="col-auto">
              <div className="input-group">
                <input className="form-control" placeholder="Tìm mã, tên phụ tùng..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <span className="input-group-text"><i className="fe fe-search"></i></span>
              </div>
            </div>
            <div className="col-auto d-flex align-items-center">
              <div className="form-check mb-0">
                <input className="form-check-input" type="checkbox" id="belowMin" checked={belowMin} onChange={(e) => setBelowMin(e.target.checked)} />
                <label className="form-check-label small" htmlFor="belowMin">Chỉ hiện dưới định mức</label>
              </div>
            </div>
            <div className="col-auto d-flex align-items-center"><small className="text-muted">{stocks.length} phụ tùng</small></div>
          </div>

          <div className="card"><div className="card-body p-0"><div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã</th><th>Tên phụ tùng</th><th>Xưởng</th>
                  <th className="text-end">Tồn kho</th><th className="text-end">Tồn tối thiểu</th>
                  <th>Vị trí</th><th className="text-center">Cập nhật</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : stocks.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có dữ liệu tồn kho. Hãy nhập kho phụ tùng đầu tiên.</td></tr>
                ) : (
                  stocks.map((s) => (
                    <tr key={s.id} className={s.isBelowMin ? 'table-warning' : ''}>
                      <td><code>{s.sparePart?.code}</code></td>
                      <td className="fw-medium">{s.sparePart?.name}</td>
                      <td className="small text-muted">{s.factory?.name}</td>
                      <td className="text-end fw-medium">
                        {fmtNum(s.quantity)} <span className="text-muted small">{s.sparePart?.unit ?? ''}</span>
                      </td>
                      <td className="text-end small text-muted">{fmtNum(s.minQuantity)}</td>
                      <td className="small text-muted">{s.location ?? '—'}</td>
                      <td className="text-center small">{fmtDateTime(s.updatedAt)}</td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button onClick={() => setAdjustTarget(s)} className="btn btn-sm btn-outline-secondary" title="Kiểm kê">
                              <ClipboardCheck size={13} />
                            </button>
                            <button onClick={() => setMinTarget(s)} className="btn btn-sm btn-outline-secondary" title="Đặt định mức tồn">
                              <i className="fe fe-sliders"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div></div></div>
        </>
      ) : (
        <>
          <div className="card"><div className="card-body p-0"><div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th className="text-center">Thời điểm</th><th>Phụ tùng</th><th>Xưởng</th>
                  <th className="text-center">Loại</th><th className="text-end">Số lượng</th>
                  <th className="text-end">Tồn sau</th><th>Chứng từ liên quan</th>
                </tr>
              </thead>
              <tbody>
                {!movements ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : movements.data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có biến động kho nào</td></tr>
                ) : (
                  movements.data.map((m) => (
                    <tr key={m.id}>
                      <td className="text-center small">{fmtDateTime(m.movementDate)}</td>
                      <td>
                        <div className="fw-medium">{m.sparePart?.name}</div>
                        <div className="small text-muted">{m.sparePart?.code}</div>
                      </td>
                      <td className="small text-muted">{m.factory?.name}</td>
                      <td className="text-center"><span className={`badge ${MOVEMENT_BADGE[m.type]}`}>{MOVEMENT_TYPE_LABELS[m.type]}</span></td>
                      <td className="text-end">
                        {m.type === 'OUT' ? '−' : m.type === 'IN' ? '+' : ''}{fmtNum(m.quantity)}
                        <span className="text-muted small"> {m.sparePart?.unit ?? ''}</span>
                      </td>
                      <td className="text-end fw-medium">{fmtNum(m.balanceAfter)}</td>
                      <td className="small text-muted">
                        {m.workOrder && <div>Phiếu {m.workOrder.orderNo}</div>}
                        {m.partRequest && <div>Yêu cầu {m.partRequest.requestNo}</div>}
                        {m.documentNo && <div>Chứng từ {m.documentNo}</div>}
                        {m.supplier && <div>NCC: {m.supplier}</div>}
                        {m.reason && <div>{m.reason}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div></div></div>

          {movements && (
            <Pagination page={movementPage} totalPages={movements.totalPages} total={movements.total} pageSize={movements.pageSize} onPageChange={setMovementPage} />
          )}
        </>
      )}

      <ReceiveStockDialog open={receiveOpen} onClose={() => setReceiveOpen(false)} />

      {adjustTarget && <AdjustStockDialog stock={adjustTarget} onClose={() => setAdjustTarget(null)} />}
      {minTarget && <MinQuantityDialog stock={minTarget} onClose={() => setMinTarget(null)} />}
    </PageWrapper>
  )
}

function ReceiveStockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sparePartId, setSparePartId] = useState<number | ''>('')
  const [factoryId, setFactoryId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [supplier, setSupplier] = useState('')
  const [documentNo, setDocumentNo] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const { user } = useAuthStore()
  const isCompanyLevel = !user?.factoryId
  const { data: spareParts = [] } = useSparePartsActive()
  const { data: factories } = useQuery({
    queryKey: ['factories-all'],
    queryFn: () => factoryApi.list({ pageSize: 100 }),
    enabled: open,
  })
  const receive = useReceiveStock()

  if (!open) return null

  const effectiveFactoryId = isCompanyLevel ? factoryId : user?.factoryId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Nhập kho phụ tùng</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!sparePartId) { setError('Phải chọn phụ tùng'); return }
            if (!effectiveFactoryId) { setError('Phải chọn xưởng'); return }
            if (!quantity || Number(quantity) <= 0) { setError('Số lượng phải lớn hơn 0'); return }
            receive.mutate(
              {
                sparePartId: Number(sparePartId),
                factoryId: Number(effectiveFactoryId),
                quantity: Number(quantity),
                unitPrice: unitPrice ? Number(unitPrice) : undefined,
                supplier: supplier.trim() || undefined,
                documentNo: documentNo.trim() || undefined,
                note: note.trim() || undefined,
              },
              { onSuccess: () => { onClose(); setSparePartId(''); setQuantity(''); setUnitPrice(''); setSupplier(''); setDocumentNo(''); setNote('') } },
            )
          }}
          className="p-5 space-y-3"
        >
          <div>
            <label className="text-sm font-medium mb-1 block">Phụ tùng *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={sparePartId} onChange={(e) => setSparePartId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Chọn phụ tùng —</option>
              {spareParts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>

          {isCompanyLevel && (
            <div>
              <label className="text-sm font-medium mb-1 block">Xưởng *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={factoryId} onChange={(e) => setFactoryId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— Chọn xưởng —</option>
                {factories?.data.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Số lượng nhập *</label>
              <input type="number" min={0} step="0.1" className="w-full rounded-lg border px-3 py-2 text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Đơn giá (đ)</label>
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Nhà cung cấp</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Số hóa đơn / phiếu</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={receive.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {receive.isPending ? 'Đang lưu...' : 'Nhập kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdjustStockDialog({ stock, onClose }: { stock: SparePartStock; onClose: () => void }) {
  const [quantity, setQuantity] = useState(String(Number(stock.quantity)))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const adjust = useAdjustStock()

  const diff = Number(quantity || 0) - Number(stock.quantity)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Kiểm kê tồn kho</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!reason.trim()) { setError('Phải nhập lý do điều chỉnh'); return }
            adjust.mutate(
              {
                sparePartId: stock.sparePartId,
                factoryId: stock.factoryId,
                quantity: Number(quantity),
                reason: reason.trim(),
              },
              { onSuccess: onClose },
            )
          }}
          className="p-5 space-y-3"
        >
          <div className="small text-muted">
            {stock.sparePart?.code} — {stock.sparePart?.name}<br />
            Tồn hệ thống hiện tại: <strong>{fmtNum(stock.quantity)} {stock.sparePart?.unit ?? ''}</strong>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Số tồn thực tế đếm được *</label>
            <input type="number" min={0} step="0.1" className="w-full rounded-lg border px-3 py-2 text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            {diff !== 0 && (
              <p className={`text-xs mt-1 ${diff > 0 ? 'text-success' : 'text-danger'}`}>
                Chênh lệch: {diff > 0 ? '+' : ''}{fmtNum(diff)}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Lý do điều chỉnh *</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Kiểm kê định kỳ tháng 8" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={adjust.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {adjust.isPending ? 'Đang lưu...' : 'Lưu kiểm kê'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MinQuantityDialog({ stock, onClose }: { stock: SparePartStock; onClose: () => void }) {
  const [minQuantity, setMinQuantity] = useState(String(Number(stock.minQuantity)))
  const [location, setLocation] = useState(stock.location ?? '')
  const setMin = useSetMinQuantity()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Định mức tồn tối thiểu</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setMin.mutate(
              {
                sparePartId: stock.sparePartId,
                factoryId: stock.factoryId,
                minQuantity: Number(minQuantity || 0),
                location: location.trim() || undefined,
              },
              { onSuccess: onClose },
            )
          }}
          className="p-5 space-y-3"
        >
          <div className="small text-muted">{stock.sparePart?.code} — {stock.sparePart?.name}</div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tồn tối thiểu (cảnh báo khi thấp hơn)</label>
            <input type="number" min={0} step="0.1" className="w-full rounded-lg border px-3 py-2 text-sm" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Vị trí trong kho</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Kệ A2" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={setMin.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {setMin.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
