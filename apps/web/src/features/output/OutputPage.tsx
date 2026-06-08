import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { AlertTriangle, Clock, Wifi, WifiOff, RefreshCw, CheckCircle2, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMyStyles, useTodayOutput, useUpsertOutput, useOfflineSync } from './output.hooks'
import { OutputMatrixCard, TOTAL_KEY, type MatrixCell } from './OutputMatrixCard'
import { outputApi, type DailyOutput } from './output.api'
import { getOfflineQueueCount } from './lib/offline-store'
import { toast } from '@/lib/toast'
import { useAppSettings } from '@/features/settings/settings.hooks'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const SectionMatrixPage = lazy(() => import('./SectionMatrixPage'))
const FinishingEntryPage = lazy(() => import('./FinishingEntryPage'))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })
}

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`

// Màn nhập của CHUYỀN (tổ trưởng) — chỉ công đoạn May (SEWING).
function LineOutputPage() {
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
  const hasOutput = (styleId: number) => outputs.some((o) => o.styleId === styleId && o.stage === 'SEWING' && o.quantity > 0)

  // Giá trị ban đầu của ma trận (hoặc ô tổng) May cho 1 mã hàng
  const buildInitial = (styleId: number): Record<string, string> => {
    const v: Record<string, string> = {}
    for (const o of outputs as DailyOutput[]) {
      if (o.styleId !== styleId || o.stage !== 'SEWING') continue
      if (o.colorId != null && o.sizeId != null) {
        v[cellKey(o.colorId, o.sizeId)] = String(o.quantity)
      } else {
        // Chế độ tổng (không màu/size)
        v[TOTAL_KEY] = String(o.quantity)
      }
    }
    return v
  }

  const handleSave = useCallback(
    async (styleId: number, cells: MatrixCell[]) => {
      if (cells.length === 0) return
      // Chặn nguyên lô TRƯỚC khi lưu: tổng nhập trong ngày không được vượt kế hoạch chuyền
      const total = cells.reduce((s, c) => s + (c.quantity || 0), 0)
      try {
        const v = await outputApi.validateTotal({ styleId, total })
        if (!v.ok) {
          toast.error(
            `Vượt kế hoạch: đã may ${v.otherDays.toLocaleString('vi-VN')} + nhập ${total.toLocaleString('vi-VN')} = ${v.wouldBe.toLocaleString('vi-VN')} > kế hoạch ${v.planned.toLocaleString('vi-VN')}. Vui lòng nhập lại.`,
          )
          return
        }
      } catch {
        // Nếu API kiểm tra lỗi (vd offline) → bỏ qua, để backend chặn khi lưu
      }
      for (const cell of cells) {
        await upsert.mutateAsync({ styleId, colorId: cell.colorId ?? undefined, sizeId: cell.sizeId ?? undefined, stage: 'SEWING', quantity: cell.quantity })
      }
      await refetchToday()
      setOfflineCount(await getOfflineQueueCount())
      toast.success('Lưu sản lượng thành công!')
    },
    [upsert, refetchToday],
  )

  if (stylesLoading || todayLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
        <div style={{ padding: 16 }}>
          <div className="card mb-3"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2" style={{ height: 20 }}></span><span className="placeholder col-12" style={{ height: 60 }}></span></div></div>
        </div>
      </div>
    )
  }

  const current = styles[currentIndex]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      <div className="sticky-top bg-white border-bottom px-3 py-2">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h5 className="fw-bold mb-0">Nhập sản lượng May</h5>
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

      <div style={{ padding: '12px 12px 0' }}>
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

            {current && (
              <OutputMatrixCard
                key={current.id}
                style={current}
                initialValues={buildInitial(current.id)}
                isPastCutoff={isPastCutoff}
                isSaving={upsert.isPending}
                saveLabel="Lưu sản lượng May"
                onSave={(cells) => handleSave(current.id, cells)}
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

// Rẽ nhánh màn nhập theo bộ phận của user đăng nhập.
export default function OutputPage() {
  const section = useAuthStore((s) => s.productionSection)()
  const { data: settings } = useAppSettings()

  if (section === 'CUTTING') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SectionMatrixPage section="CUTTING" title="Nhập sản lượng Cắt" />
      </Suspense>
    )
  }
  if (section === 'QC') {
    // KCS chỉ nhập khi cấu hình bật
    if (settings && !settings.qcReportingEnabled) {
      return (
        <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 240, padding: 16, textAlign: 'center' }}>
          Bộ phận KCS hiện chưa được bật báo cáo sản lượng. Liên hệ quản trị viên để bật trong phần Cài đặt.
        </div>
      )
    }
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SectionMatrixPage section="QC" title="Nhập sản lượng KCS" />
      </Suspense>
    )
  }
  if (section === 'FINISHING') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <FinishingEntryPage />
      </Suspense>
    )
  }

  // Mặc định: màn nhập của Chuyền (tổ trưởng/tổ phó)
  return <LineOutputPage />
}
