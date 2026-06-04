import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Clock, Wifi, WifiOff, RefreshCw, CheckCircle2, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMyStyles, useTodayOutput, useUpsertOutput, useOfflineSync } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type ProductionStage, type DailyOutput, type StyleForLine } from './output.api'
import { getOfflineQueueCount } from './lib/offline-store'

const STAGES: ProductionStage[] = ['CUTTING', 'SEWING', 'QC', 'PACKING']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })
}

const key = (stage: string, colorId: number, sizeId: number) => `${stage}:${colorId}:${sizeId}`

interface MatrixCardProps {
  style: StyleForLine
  outputs: DailyOutput[]
  isPastCutoff: boolean
  isSaving: boolean
  onSaveStage: (styleId: number, stage: ProductionStage, cells: { colorId: number; sizeId: number; quantity: number }[]) => Promise<void>
}

function StyleMatrixCard({ style, outputs, isPastCutoff, isSaving, onSaveStage }: MatrixCardProps) {
  const colors = (style.styleColors ?? []).map((sc) => sc.color).filter((c): c is NonNullable<typeof c> => !!c)
  const sizes = (style.styleSizes ?? [])
    .map((ss) => ss.size)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const hasMatrix = colors.length > 0 && sizes.length > 0

  const [activeStage, setActiveStage] = useState<ProductionStage>('SEWING')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // Prefill từ sản lượng hôm nay (theo style, mọi công đoạn)
  useEffect(() => {
    const v: Record<string, string> = {}
    for (const o of outputs) {
      if (o.styleId === style.id && o.colorId != null && o.sizeId != null) {
        v[key(o.stage, o.colorId, o.sizeId)] = String(o.quantity)
      }
    }
    setValues(v)
    setSaved(false)
  }, [style.id, outputs])

  if (!hasMatrix) {
    return (
      <div className="card mb-3"><div className="card-body text-center text-muted py-4">
        <p className="mb-0">Mã hàng <b>{style.code}</b> chưa khai báo Màu/Size.</p>
        <small>Báo phòng kế hoạch thêm Màu/Size cho mã hàng này.</small>
      </div></div>
    )
  }

  const cellVal = (c: number, s: number) => values[key(activeStage, c, s)] ?? ''
  const setCell = (c: number, s: number, val: string) => setValues((v) => ({ ...v, [key(activeStage, c, s)]: val }))
  const colTotal = (sizeId: number) => colors.reduce((sum, c) => sum + (parseInt(cellVal(c.id, sizeId) || '0') || 0), 0)
  const rowTotal = (colorId: number) => sizes.reduce((sum, s) => sum + (parseInt(cellVal(colorId, s.id) || '0') || 0), 0)
  const stageTotal = colors.reduce((sum, c) => sum + rowTotal(c.id), 0)

  const handleSave = async () => {
    const cells = colors
      .flatMap((c) => sizes.map((s) => ({ colorId: c.id, sizeId: s.id, raw: values[key(activeStage, c.id, s.id)] })))
      .filter((x) => x.raw !== undefined && x.raw !== '')
      .map((x) => ({ colorId: x.colorId, sizeId: x.sizeId, quantity: parseInt(x.raw || '0') || 0 }))
    await onSaveStage(style.id, activeStage, cells)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <div className="fw-bold small">{style.code}</div>
        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{style.name}</div>
      </div>
      <div className="card-body py-3">
        {/* Tab công đoạn */}
        <div className="d-flex gap-1 mb-3 overflow-auto pb-1">
          {STAGES.map((st) => (
            <button key={st} onClick={() => setActiveStage(st)}
              className={`btn btn-sm flex-shrink-0 ${activeStage === st ? `${STAGE_COLORS[st]} fw-semibold` : 'btn-outline-secondary'}`}>
              {STAGE_LABELS[st]}
            </button>
          ))}
        </div>

        {/* Lưới màu × size */}
        <div className="table-responsive border" style={{ borderRadius: 4 }}>
          <table className="table table-sm table-bordered mb-0 text-center" style={{ minWidth: 320 }}>
            <thead className="thead-light">
              <tr>
                <th className="text-start" style={{ minWidth: 96 }}>Màu \\ Size</th>
                {sizes.map((s) => <th key={s.id}>{s.code}</th>)}
                <th>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id}>
                  <td className="text-start">
                    <span className="d-inline-flex align-items-center gap-1">
                      <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid #ccc', background: c.hex ?? '#fff', display: 'inline-block' }} />
                      {c.name}
                    </span>
                  </td>
                  {sizes.map((s) => (
                    <td key={s.id} style={{ padding: 2 }}>
                      <input type="number" inputMode="numeric" min={0} disabled={isPastCutoff}
                        className="form-control form-control-sm text-center" style={{ width: 60, margin: '0 auto' }}
                        value={cellVal(c.id, s.id)}
                        onChange={(e) => setCell(c.id, s.id, e.target.value)} />
                    </td>
                  ))}
                  <td className="fw-medium align-middle">{rowTotal(c.id).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="thead-light">
                <td className="text-start fw-semibold">Tổng</td>
                {sizes.map((s) => <td key={s.id} className="fw-medium">{colTotal(s.id).toLocaleString()}</td>)}
                <td className="fw-bold text-primary">{stageTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!isPastCutoff && (
          <button className="btn btn-primary w-100 mt-3" disabled={isSaving} onClick={handleSave}>
            {saved ? <span className="d-flex align-items-center justify-content-center gap-1"><CheckCircle2 size={16} /> Đã lưu</span> : isSaving ? 'Đang lưu...' : `Lưu công đoạn ${STAGE_LABELS[activeStage]}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function OutputPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineCount, setOfflineCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const navigate = useNavigate()

  const { data: styles = [], isLoading: stylesLoading } = useMyStyles()
  const { data: today, isLoading: todayLoading, refetch: refetchToday } = useTodayOutput()
  const upsert = useUpsertOutput()
  const { sync } = useOfflineSync()

  useEffect(() => {
    const onOnline = async () => { setIsOnline(true); await sync(); setOfflineCount(await getOfflineQueueCount()) }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [sync])

  useEffect(() => { getOfflineQueueCount().then(setOfflineCount) }, [])

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19
  const outputs = today?.outputs ?? []
  const hasOutput = (styleId: number) => outputs.some((o) => o.styleId === styleId && o.quantity > 0)

  const handleSaveStage = useCallback(
    async (styleId: number, stage: ProductionStage, cells: { colorId: number; sizeId: number; quantity: number }[]) => {
      for (const cell of cells) {
        await upsert.mutateAsync({ styleId, colorId: cell.colorId, sizeId: cell.sizeId, stage, quantity: cell.quantity })
      }
      await refetchToday()
      setOfflineCount(await getOfflineQueueCount())
    },
    [upsert, refetchToday],
  )

  if (stylesLoading || todayLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
          <div className="card mb-3"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2" style={{ height: 20 }}></span><span className="placeholder col-12" style={{ height: 60 }}></span></div></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      <div className="sticky-top bg-white border-bottom px-3 py-2">
        <div className="d-flex align-items-center justify-content-between" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div>
            <h5 className="fw-bold mb-0">Nhập sản lượng</h5>
            {today && <small className="text-muted">{formatDate(today.date)}</small>}
          </div>
          <div className="d-flex align-items-center gap-2">
            {isOnline ? (
              <span className="badge bg-success-transparent text-success border border-success d-flex align-items-center gap-1"><Wifi size={12} /> Online</span>
            ) : (
              <span className="badge bg-warning-transparent text-warning border border-warning d-flex align-items-center gap-1"><WifiOff size={12} /> Offline{offlineCount > 0 ? ` (${offlineCount})` : ''}</span>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={() => refetchToday()}><RefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 16px 0' }}>
        {today && isPastCutoff && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="small">Đã qua giờ khóa {cutoffHour}:00 — không thể nhập sản lượng hôm nay</span>
          </div>
        )}
        {today && !isPastCutoff && (cutoffHour - new Date().getHours()) <= 1 && (
          <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3">
            <Clock size={18} className="flex-shrink-0" />
            <span className="small">Còn ít hơn 1 giờ đến giờ khóa ({cutoffHour}:00)</span>
          </div>
        )}

        {styles.length === 0 ? (
          <div className="card mb-3"><div className="card-body text-center text-muted py-5"><p className="mb-0">Chuyền chưa được gán mã hàng nào</p></div></div>
        ) : (
          <>
            <div className="d-flex gap-2 mb-3 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {styles.map((s, i) => (
                <button key={s.id}
                  className={`btn btn-sm flex-shrink-0 d-flex align-items-center gap-1 ${i === currentIndex ? 'btn-primary text-white' : hasOutput(s.id) ? 'btn-success-transparent text-success border border-success' : 'btn-outline-secondary'}`}
                  onClick={() => setCurrentIndex(i)}>
                  {hasOutput(s.id) && <CheckCircle2 size={12} />}
                  {s.code}
                </button>
              ))}
            </div>

            {styles[currentIndex] && (
              <StyleMatrixCard
                key={styles[currentIndex].id}
                style={styles[currentIndex]}
                outputs={outputs}
                isPastCutoff={isPastCutoff}
                isSaving={upsert.isPending}
                onSaveStage={handleSaveStage}
              />
            )}
          </>
        )}

        <button className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2" onClick={() => navigate('/output/history')}>
          <History size={16} /> Xem lịch sử sản xuất chuyền
        </button>
      </div>
    </div>
  )
}
