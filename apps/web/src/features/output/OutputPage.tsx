import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw, ChevronDown } from 'lucide-react'
import { useMyStyles, useTodayOutput, useUpsertOutput, useOfflineSync } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type ProductionStage, type DailyOutput } from './output.api'
import { getOfflineQueueCount } from './lib/offline-store'

const STAGES: ProductionStage[] = ['CUTTING', 'SEWING', 'QC', 'PACKING']

const schema = z.object({
  styleId: z.string().min(1, 'Chọn mã hàng'),
  stage: z.enum(['CUTTING', 'SEWING', 'QC', 'PACKING']),
  quantity: z.string().min(1, 'Nhập số lượng').refine((v) => parseInt(v) >= 0, 'Số lượng không hợp lệ'),
})

type FormData = z.infer<typeof schema>

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function CutoffWarning({ cutoffHour, isPastCutoff }: { cutoffHour: number; isPastCutoff: boolean }) {
  const now = new Date()
  const hoursLeft = cutoffHour - now.getHours() - (now.getMinutes() > 0 ? 1 : 0)
  const showWarning = !isPastCutoff && hoursLeft <= 1

  if (isPastCutoff) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-2">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <span>Đã qua giờ khóa {cutoffHour}:00 — không thể nhập sản lượng hôm nay</span>
      </div>
    )
  }
  if (showWarning) {
    return (
      <div className="alert alert-warning d-flex align-items-center gap-2">
        <Clock size={20} className="flex-shrink-0" />
        <span>Còn ít hơn 1 giờ đến giờ khóa ({cutoffHour}:00)</span>
      </div>
    )
  }
  return null
}

function OutputProgress({
  output,
  plannedQty,
}: {
  output: DailyOutput | undefined
  plannedQty: number
}) {
  const actual = output?.quantity ?? 0
  const pct = plannedQty > 0 ? Math.min(100, Math.round((actual / plannedQty) * 100)) : null

  return (
    <div>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">Đã nhập</span>
        <span className="fw-semibold">{actual.toLocaleString('vi-VN')}</span>
      </div>
      {plannedQty > 0 && (
        <>
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Kế hoạch</span>
            <span>{plannedQty.toLocaleString('vi-VN')}</span>
          </div>
          <div className="progress mb-1" style={{ height: 8 }}>
            <div
              className={`progress-bar ${pct! >= 100 ? 'bg-success' : pct! >= 80 ? 'bg-warning' : 'bg-danger'}`}
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
          <p className={`small text-end fw-medium mb-0 ${pct! >= 100 ? 'text-success' : pct! >= 80 ? 'text-warning' : 'text-danger'}`}>
            {pct}%
          </p>
        </>
      )}
    </div>
  )
}

export default function OutputPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineCount, setOfflineCount] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { data: styles = [], isLoading: stylesLoading } = useMyStyles()
  const { data: today, isLoading: todayLoading, refetch: refetchToday } = useTodayOutput()
  const upsert = useUpsertOutput()
  const { sync } = useOfflineSync()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { styleId: '', stage: 'SEWING', quantity: '' },
  })

  // Theo dõi online/offline
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      await sync()
      const count = await getOfflineQueueCount()
      setOfflineCount(count)
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

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19

  const watchedStyle = form.watch('styleId')
  const watchedStage = form.watch('stage')

  // Tìm output hiện tại cho style+stage đã chọn
  const currentOutput = today?.outputs.find(
    (o) => o.styleId === parseInt(watchedStyle) && o.stage === watchedStage,
  )

  // Tìm kế hoạch cho style đã chọn
  const currentPlan = today?.factoryPlans.find(
    (p) => p.companyPlan?.styleId === parseInt(watchedStyle),
  )
  const plannedQty = currentPlan
    ? Math.round(currentPlan.plannedQuantity / 20) // ước tính sản lượng ngày = tổng / 20 ngày sx
    : 0

  // Prefill số lượng nếu đã nhập trước đó
  useEffect(() => {
    if (currentOutput) {
      form.setValue('quantity', String(currentOutput.quantity))
    } else {
      form.setValue('quantity', '')
    }
  }, [currentOutput, form])

  const onSubmit = useCallback(
    async (data: FormData) => {
      await upsert.mutateAsync({
        styleId: parseInt(data.styleId),
        stage: data.stage as ProductionStage,
        quantity: parseInt(data.quantity),
      })
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2000)
      refetchToday()
      const count = await getOfflineQueueCount()
      setOfflineCount(count)
    },
    [upsert, refetchToday],
  )

  const isLoading = stylesLoading || todayLoading

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      {/* Header */}
      <div className="sticky-top bg-white border-bottom px-3 py-3">
        <div className="d-flex align-items-center justify-content-between" style={{ maxWidth: 512, margin: '0 auto' }}>
          <div>
            <h5 className="fw-bold mb-0">Nhập sản lượng</h5>
            {today && (
              <small className="text-muted">{formatDate(today.date)}</small>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            {/* Trạng thái online */}
            {isOnline ? (
              <span className="badge bg-success-transparent text-success border border-success d-flex align-items-center gap-1">
                <Wifi size={12} /> Online
              </span>
            ) : (
              <span className="badge bg-warning-transparent text-warning border border-warning d-flex align-items-center gap-1">
                <WifiOff size={12} /> Offline{offlineCount > 0 ? ` (${offlineCount})` : ''}
              </span>
            )}
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => refetchToday()}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px 0' }}>
        {/* Cảnh báo cutoff */}
        {today && (
          <CutoffWarning cutoffHour={cutoffHour} isPastCutoff={isPastCutoff} />
        )}

        {/* Form nhập sản lượng */}
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="card-title mb-0">Nhập sản lượng</h6>
          </div>
          <div className="card-body">
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Chọn mã hàng */}
              <div className="mb-3">
                <label className="form-label fw-medium">Mã hàng</label>
                <select
                  className="form-select form-select-lg"
                  disabled={isLoading || isPastCutoff}
                  {...form.register('styleId')}
                >
                  <option value="">Chọn mã hàng...</option>
                  {styles.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.styleId && (
                  <div className="text-danger small mt-1">{form.formState.errors.styleId.message}</div>
                )}
              </div>

              {/* Chọn công đoạn */}
              <div className="mb-3">
                <label className="form-label fw-medium">Công đoạn</label>
                <div className="row g-2">
                  {STAGES.map((stage) => {
                    const isSelected = form.watch('stage') === stage
                    return (
                      <div key={stage} className="col-6">
                        <button
                          type="button"
                          disabled={isPastCutoff}
                          onClick={() => form.setValue('stage', stage)}
                          className={`btn w-100 py-3 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                        >
                          {STAGE_LABELS[stage]}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {form.formState.errors.stage && (
                  <div className="text-danger small mt-1">{form.formState.errors.stage.message}</div>
                )}
              </div>

              {/* Tiến độ hiện tại */}
              {watchedStyle && (
                <div className="rounded bg-light p-3 mb-3">
                  <OutputProgress output={currentOutput} plannedQty={plannedQty} />
                </div>
              )}

              {/* Nhập số lượng — input lớn dễ bấm */}
              <div className="mb-3">
                <label className="form-label fw-medium">Số lượng</label>
                <input
                  {...form.register('quantity')}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  disabled={isPastCutoff}
                  placeholder="0"
                  className="form-control text-center fw-bold"
                  style={{ fontSize: '2.5rem', padding: '16px', borderWidth: 2 }}
                />
                {form.formState.errors.quantity && (
                  <div className="text-danger small mt-1">{form.formState.errors.quantity.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 text-white"
                style={{ height: 56, fontSize: '1.1rem', fontWeight: 600 }}
                disabled={isPastCutoff || upsert.isPending || isLoading}
              >
                {upsert.isPending ? (
                  'Đang lưu...'
                ) : submitted ? (
                  <span className="d-flex align-items-center justify-content-center gap-2">
                    <CheckCircle2 size={20} /> Đã lưu!
                  </span>
                ) : (
                  'Lưu sản lượng'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Tổng kết hôm nay */}
        {today && today.outputs.length > 0 && (
          <div className="card mb-3">
            <div
              className="card-header d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              data-bs-toggle="collapse"
              data-bs-target="#outputSummary"
            >
              <h6 className="card-title mb-0">Đã nhập hôm nay ({today.outputs.length})</h6>
              <ChevronDown size={16} className="text-muted" />
            </div>
            <div id="outputSummary" className="collapse show">
              <div className="card-body pt-0">
                {today.outputs.map((o) => (
                  <div
                    key={o.id}
                    className="d-flex align-items-center justify-content-between rounded bg-light px-3 py-2 mb-2"
                  >
                    <div>
                      <p className="fw-medium mb-1 small">{o.style?.code ?? `Style #${o.styleId}`}</p>
                      <span className={`badge ${STAGE_COLORS[o.stage]}`}>
                        {STAGE_LABELS[o.stage]}
                      </span>
                    </div>
                    <span className="fw-bold fs-5">{o.quantity.toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
