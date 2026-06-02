import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Clock, Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMyStyles, useTodayOutput, useUpsertOutput, useOfflineSync } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type ProductionStage, type DailyOutput, type StyleForLine } from './output.api'
import { getOfflineQueueCount } from './lib/offline-store'

const STAGES: ProductionStage[] = ['CUTTING', 'SEWING', 'QC', 'PACKING']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

// Kiểm tra mã hàng đã nhập đủ 4 công đoạn chưa (ít nhất 1 công đoạn có qty > 0)
function isStyleFullyEntered(styleId: number, outputs: DailyOutput[]) {
  const entered = outputs.filter((o) => o.styleId === styleId && o.quantity > 0)
  return entered.length === STAGES.length
}

function isStylePartiallyEntered(styleId: number, outputs: DailyOutput[]) {
  return outputs.some((o) => o.styleId === styleId && o.quantity > 0)
}

type StageValues = Record<ProductionStage, string>

const emptyStages = (): StageValues => ({ CUTTING: '', SEWING: '', QC: '', PACKING: '' })

interface StyleCardProps {
  style: StyleForLine
  index: number
  total: number
  outputs: DailyOutput[]
  factoryPlans: { companyPlan?: { styleId: number; plannedQuantity?: number } }[]
  isPastCutoff: boolean
  isSaving: boolean
  onSave: (styleId: number, values: StageValues) => Promise<void>
  onPrev: () => void
  onNext: () => void
}

function StyleCard({ style, index, total, outputs, isPastCutoff, isSaving, onSave, onPrev, onNext }: StyleCardProps) {
  const [values, setValues] = useState<StageValues>(() => {
    const init = emptyStages()
    STAGES.forEach((stage) => {
      const existing = outputs.find((o) => o.styleId === style.id && o.stage === stage)
      if (existing) init[stage] = String(existing.quantity)
    })
    return init
  })
  const [saved, setSaved] = useState(false)

  // Khi style thay đổi, reset values từ outputs hiện tại
  useEffect(() => {
    const init = emptyStages()
    STAGES.forEach((stage) => {
      const existing = outputs.find((o) => o.styleId === style.id && o.stage === stage)
      if (existing) init[stage] = String(existing.quantity)
    })
    setValues(init)
    setSaved(false)
  }, [style.id, outputs])

  const handleSave = async () => {
    await onSave(style.id, values)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveAndNext = async () => {
    await onSave(style.id, values)
    onNext()
  }

  const anyFilled = STAGES.some((s) => values[s] !== '' && parseInt(values[s] || '0') >= 0)
  const isFullyEntered = isStyleFullyEntered(style.id, outputs)

  return (
    <div className="card mb-3">
      {/* Style header */}
      <div className="card-header py-2 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary-transparent text-primary fw-semibold">{index + 1}/{total}</span>
          {isFullyEntered && <CheckCircle2 size={16} className="text-success" />}
          <div>
            <div className="fw-bold small">{style.code}</div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{style.name}</div>
          </div>
        </div>
        <div className="d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-secondary px-2"
            onClick={onPrev}
            disabled={index === 0}
            title="Mã hàng trước"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary px-2"
            onClick={onNext}
            disabled={index === total - 1}
            title="Mã hàng tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="card-body py-3">
        {/* 4 công đoạn nhập sản lượng */}
        <div className="d-flex flex-column gap-2 mb-3">
          {STAGES.map((stage) => {
            const existing = outputs.find((o) => o.styleId === style.id && o.stage === stage)
            return (
              <div key={stage} className="d-flex align-items-center gap-2">
                <span className={`badge flex-shrink-0 ${STAGE_COLORS[stage]}`} style={{ width: 76, textAlign: 'center' }}>
                  {STAGE_LABELS[stage]}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  disabled={isPastCutoff}
                  placeholder={existing ? String(existing.quantity) : '0'}
                  value={values[stage]}
                  onChange={(e) => setValues((v) => ({ ...v, [stage]: e.target.value }))}
                  className="form-control text-end fw-bold"
                  style={{ fontSize: '1.3rem', padding: '8px 12px', borderWidth: 2 }}
                />
                <span className="text-muted small flex-shrink-0">SP</span>
              </div>
            )
          })}
        </div>

        {/* Buttons */}
        {!isPastCutoff && (
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary flex-1"
              disabled={!anyFilled || isSaving}
              onClick={handleSave}
            >
              {saved ? (
                <span className="d-flex align-items-center justify-content-center gap-1">
                  <CheckCircle2 size={16} /> Đã lưu
                </span>
              ) : isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
            {index < total - 1 && (
              <button
                className="btn btn-primary flex-1 d-flex align-items-center justify-content-center gap-1"
                disabled={isSaving}
                onClick={handleSaveAndNext}
              >
                Lưu & Tiếp <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Thanh tiến độ tất cả mã hàng
function StyleProgressBar({ styles, outputs }: { styles: StyleForLine[]; outputs: DailyOutput[] }) {
  const done = styles.filter((s) => isStyleFullyEntered(s.id, outputs)).length
  const partial = styles.filter((s) => !isStyleFullyEntered(s.id, outputs) && isStylePartiallyEntered(s.id, outputs)).length
  const total = styles.length

  return (
    <div className="card mb-3">
      <div className="card-body py-2 px-3">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <small className="text-muted">Tiến độ nhập hôm nay</small>
          <small className="fw-semibold">{done}/{total} mã hàng đủ công đoạn</small>
        </div>
        <div className="d-flex gap-1" style={{ height: 8 }}>
          {styles.map((s) => {
            const full = isStyleFullyEntered(s.id, outputs)
            const part = isStylePartiallyEntered(s.id, outputs)
            return (
              <div
                key={s.id}
                className={`flex-1 rounded ${full ? 'bg-success' : part ? 'bg-warning' : 'bg-secondary-transparent'}`}
                style={{ minWidth: 8 }}
                title={s.code}
              />
            )
          })}
        </div>
        {partial > 0 && (
          <small className="text-warning d-block mt-1">
            {partial} mã chưa đủ công đoạn
          </small>
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
    const onOnline = async () => {
      setIsOnline(true)
      await sync()
      setOfflineCount(await getOfflineQueueCount())
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [sync])

  useEffect(() => {
    getOfflineQueueCount().then(setOfflineCount)
  }, [])

  // Tự động focus vào mã hàng chưa nhập đầu tiên
  useEffect(() => {
    if (styles.length > 0 && today) {
      const firstUnfinished = styles.findIndex((s) => !isStyleFullyEntered(s.id, today.outputs))
      if (firstUnfinished >= 0) setCurrentIndex(firstUnfinished)
    }
  }, [styles.length, !!today])

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19

  const handleSave = useCallback(
    async (styleId: number, values: StageValues) => {
      for (const stage of STAGES) {
        const qty = parseInt(values[stage] || '0')
        if (values[stage] !== '') {
          await upsert.mutateAsync({ styleId, stage, quantity: qty })
        }
      }
      await refetchToday()
      setOfflineCount(await getOfflineQueueCount())
    },
    [upsert, refetchToday],
  )

  const isLoading = stylesLoading || todayLoading

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: 16 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card mb-3">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-8 mb-2" style={{ height: 20 }}></span>
                <span className="placeholder col-12" style={{ height: 44 }}></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      {/* Header */}
      <div className="sticky-top bg-white border-bottom px-3 py-2">
        <div className="d-flex align-items-center justify-content-between" style={{ maxWidth: 512, margin: '0 auto' }}>
          <div>
            <h5 className="fw-bold mb-0">Nhập sản lượng</h5>
            {today && <small className="text-muted">{formatDate(today.date)}</small>}
          </div>
          <div className="d-flex align-items-center gap-2">
            {isOnline ? (
              <span className="badge bg-success-transparent text-success border border-success d-flex align-items-center gap-1">
                <Wifi size={12} /> Online
              </span>
            ) : (
              <span className="badge bg-warning-transparent text-warning border border-warning d-flex align-items-center gap-1">
                <WifiOff size={12} /> Offline{offlineCount > 0 ? ` (${offlineCount})` : ''}
              </span>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={() => refetchToday()}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '12px 16px 0' }}>
        {/* Cảnh báo cutoff */}
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

        {/* Không có mã hàng nào */}
        {styles.length === 0 ? (
          <div className="card mb-3">
            <div className="card-body text-center text-muted py-5">
              <p className="mb-0">Chuyền chưa được gán mã hàng nào</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thanh tiến độ tổng */}
            <StyleProgressBar styles={styles} outputs={today?.outputs ?? []} />

            {/* Selector mã hàng — scroll ngang */}
            <div className="d-flex gap-2 mb-3 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {styles.map((s, i) => {
                const full = isStyleFullyEntered(s.id, today?.outputs ?? [])
                const part = isStylePartiallyEntered(s.id, today?.outputs ?? [])
                const isActive = i === currentIndex
                return (
                  <button
                    key={s.id}
                    className={`btn btn-sm flex-shrink-0 d-flex align-items-center gap-1 ${
                      isActive
                        ? 'btn-primary text-white'
                        : full
                          ? 'btn-success-transparent text-success border border-success'
                          : part
                            ? 'btn-warning-transparent text-warning border border-warning'
                            : 'btn-outline-secondary'
                    }`}
                    onClick={() => setCurrentIndex(i)}
                  >
                    {full && <CheckCircle2 size={12} />}
                    {s.code}
                  </button>
                )
              })}
            </div>

            {/* Card nhập liệu cho mã hàng hiện tại */}
            <StyleCard
              key={styles[currentIndex]?.id}
              style={styles[currentIndex]}
              index={currentIndex}
              total={styles.length}
              outputs={today?.outputs ?? []}
              factoryPlans={today?.factoryPlans ?? []}
              isPastCutoff={isPastCutoff}
              isSaving={upsert.isPending}
              onSave={handleSave}
              onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              onNext={() => setCurrentIndex((i) => Math.min(styles.length - 1, i + 1))}
            />
          </>
        )}

        {/* Nút xem lịch sử */}
        <button
          className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => navigate('/output/history')}
        >
          <History size={16} />
          Xem lịch sử sản xuất chuyền
        </button>
      </div>
    </div>
  )
}
