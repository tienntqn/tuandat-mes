import { useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useFactoryStyles, useSectionToday, useUpsertSection } from './output.hooks'
import { OutputMatrixCard, TOTAL_KEY, type MatrixCell } from './OutputMatrixCard'
import type { FactorySection } from './output.api'
import { toast } from '@/lib/toast'

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`

interface Props {
  section: FactorySection
  title: string
}

// Màn nhập sản lượng cho tổ cấp xưởng (Cắt / KCS) — ma trận màu × size, mọi mã hàng của xưởng.
export default function SectionMatrixPage({ section, title }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { data: styles = [], isLoading: stylesLoading } = useFactoryStyles()
  const { data: today, isLoading: todayLoading, refetch } = useSectionToday(section)
  const upsert = useUpsertSection(section)

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19
  const outputs = today?.outputs ?? []
  const hasOutput = (styleId: number) => outputs.some((o) => o.styleId === styleId && o.quantity > 0)

  const buildInitial = (styleId: number): Record<string, string> => {
    const v: Record<string, string> = {}
    for (const o of outputs) {
      if (o.styleId !== styleId) continue
      if (o.colorId != null && o.sizeId != null) v[cellKey(o.colorId, o.sizeId)] = String(o.quantity)
      else v[TOTAL_KEY] = String(o.quantity) // chế độ tổng
    }
    return v
  }

  const handleSave = async (styleId: number, cells: MatrixCell[]) => {
    for (const cell of cells) {
      await upsert.mutateAsync({ section, styleId, colorId: cell.colorId ?? undefined, sizeId: cell.sizeId ?? undefined, quantity: cell.quantity })
    }
    await refetch()
    if (cells.length > 0) toast.success('Lưu sản lượng thành công!')
  }

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
            <h5 className="fw-bold mb-0">{title}</h5>
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

        {styles.length === 0 ? (
          <div className="card mb-3"><div className="card-body text-center text-muted py-5"><p className="mb-0">Xưởng chưa có mã hàng nào đang sản xuất</p></div></div>
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
                saveLabel={`Lưu sản lượng ${title}`}
                onSave={(cells) => handleSave(current.id, cells)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
