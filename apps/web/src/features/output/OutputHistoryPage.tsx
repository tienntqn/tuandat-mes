import { useState, useMemo } from 'react'
import { useOutputHistory } from './output.hooks'
import { useMyStyles } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type DailyOutput } from './output.api'
import { BarChart2 } from 'lucide-react'

type DateFilter = '7days' | '14days' | '30days' | 'this_week' | 'last_week' | 'this_month'

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string; days: number }[] = [
  { value: 'this_week',  label: 'Tuần này',    days: 7  },
  { value: 'last_week',  label: 'Tuần trước',  days: 14 },
  { value: 'this_month', label: 'Tháng này',   days: 30 },
  { value: '7days',      label: '7 ngày qua',  days: 7  },
  { value: '14days',     label: '14 ngày qua', days: 14 },
  { value: '30days',     label: '30 ngày qua', days: 30 },
]

// Lấy range ngày từ filter
function getDateRange(filter: DateFilter): { from: Date; to: Date } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setHours(0, 0, 0, 0)

  if (filter === 'this_week') {
    const day = from.getDay() || 7 // 1=Mon ... 7=Sun
    from.setDate(from.getDate() - (day - 1))
  } else if (filter === 'last_week') {
    const day = from.getDay() || 7
    from.setDate(from.getDate() - (day - 1) - 7)
    today.setDate(today.getDate() - (today.getDay() || 7))
    today.setHours(23, 59, 59, 999)
  } else if (filter === 'this_month') {
    from.setDate(1)
  } else {
    const opt = DATE_FILTER_OPTIONS.find((o) => o.value === filter)!
    from.setDate(from.getDate() - (opt.days - 1))
  }
  return { from, to: today }
}

function groupByDate(outputs: DailyOutput[]): Record<string, DailyOutput[]> {
  return outputs.reduce(
    (acc, o) => {
      const date = o.outputDate.slice(0, 10)
      if (!acc[date]) acc[date] = []
      acc[date].push(o)
      return acc
    },
    {} as Record<string, DailyOutput[]>,
  )
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return 'Hôm nay'
  if (d.getTime() === yesterday.getTime()) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

export default function OutputHistoryPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('7days')
  const [styleFilter, setStyleFilter] = useState<string>('all')

  const opt = DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)!
  const { data: outputs = [], isLoading } = useOutputHistory(opt.days)
  const { data: styles = [] } = useMyStyles()

  // Lọc theo ngày + mã hàng
  const filtered = useMemo(() => {
    const { from, to } = getDateRange(dateFilter)
    let result = outputs.filter((o) => {
      const d = new Date(o.outputDate)
      d.setHours(0, 0, 0, 0)
      return d >= from && d <= to
    })
    if (styleFilter !== 'all') {
      result = result.filter((o) => String(o.styleId) === styleFilter)
    }
    return result
  }, [outputs, dateFilter, styleFilter])

  const grouped = groupByDate(filtered)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Tổng hợp theo mã hàng để hiển thị summary
  const totalByStyle = useMemo(() => {
    const map: Record<string, { code: string; quantity: number }> = {}
    filtered.forEach((o) => {
      const key = String(o.styleId)
      if (!map[key]) map[key] = { code: o.style?.code ?? `#${o.styleId}`, quantity: 0 }
      map[key].quantity += o.quantity
    })
    return Object.values(map).sort((a, b) => b.quantity - a.quantity)
  }, [filtered])

  const grandTotal = filtered.reduce((s, o) => s + o.quantity, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      {/* Header */}
      <div className="sticky-top bg-white border-bottom px-3 py-2">
        <div style={{ maxWidth: 512, margin: '0 auto' }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="fw-bold mb-0">Lịch sử sản lượng</h5>
            {grandTotal > 0 && (
              <span className="badge bg-primary-transparent text-primary fw-semibold">
                {grandTotal.toLocaleString('vi-VN')} SP
              </span>
            )}
          </div>
          {/* Bộ lọc thời gian */}
          <div className="d-flex gap-1 overflow-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
            {DATE_FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={`btn btn-sm flex-shrink-0 ${dateFilter === o.value ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setDateFilter(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {/* Bộ lọc mã hàng */}
          <select
            className="form-select form-select-sm"
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
          >
            <option value="all">Tất cả mã hàng</option>
            {styles.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '12px 16px 0' }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card mb-3">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-12 mb-2" style={{ height: 20 }}></span>
                <span className="placeholder col-8" style={{ height: 20 }}></span>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-5 text-center text-muted">
            <BarChart2 size={40} className="mb-2 opacity-25" />
            <p className="mb-0">Không có dữ liệu sản lượng</p>
          </div>
        ) : (
          <>
            {/* Tổng hợp theo mã hàng */}
            {totalByStyle.length > 1 && (
              <div className="card mb-3">
                <div className="card-header py-2">
                  <small className="fw-semibold text-muted text-uppercase">Tổng theo mã hàng</small>
                </div>
                <div className="card-body py-2">
                  {totalByStyle.map((item) => (
                    <div key={item.code} className="d-flex align-items-center justify-content-between py-1">
                      <span className="small fw-medium">{item.code}</span>
                      <span className="fw-bold small">{item.quantity.toLocaleString('vi-VN')} SP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chi tiết theo ngày */}
            {dates.map((date) => {
              const dayOutputs = grouped[date]
              const total = dayOutputs.reduce((s, o) => s + o.quantity, 0)
              return (
                <div key={date} className="card mb-3">
                  <div className="card-header d-flex align-items-center justify-content-between py-2">
                    <span className="small fw-semibold text-muted text-uppercase">
                      {formatDateHeader(date)}
                    </span>
                    <span className="fw-bold small">{total.toLocaleString('vi-VN')} SP</span>
                  </div>
                  <div className="card-body pt-2 pb-2">
                    {dayOutputs.map((o) => (
                      <div
                        key={o.id}
                        className="d-flex align-items-center justify-content-between rounded bg-light px-3 py-2 mb-2"
                      >
                        <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                          <span className={`badge flex-shrink-0 ${STAGE_COLORS[o.stage]}`}>
                            {STAGE_LABELS[o.stage]}
                          </span>
                          <span className="fw-medium text-truncate small">
                            {o.style?.code ?? `Style #${o.styleId}`}
                          </span>
                        </div>
                        <span className="fw-bold ms-2">{o.quantity.toLocaleString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
