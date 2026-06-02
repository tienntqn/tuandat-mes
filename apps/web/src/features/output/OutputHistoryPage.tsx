import { useState } from 'react'
import { useOutputHistory } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type DailyOutput } from './output.api'

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
  const [days, setDays] = useState(7)
  const { data: outputs = [], isLoading } = useOutputHistory(days)

  const grouped = groupByDate(outputs)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bs-light, #f8f9fa)', paddingBottom: 32 }}>
      {/* Header */}
      <div className="sticky-top bg-white border-bottom px-3 py-3">
        <div className="d-flex align-items-center justify-content-between" style={{ maxWidth: 512, margin: '0 auto' }}>
          <h5 className="fw-bold mb-0">Lịch sử sản lượng</h5>
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={String(days)}
            onChange={(e) => setDays(parseInt(e.target.value))}
          >
            <option value="7">7 ngày qua</option>
            <option value="14">14 ngày qua</option>
            <option value="30">30 ngày qua</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px 0' }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card mb-3">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-12 mb-2" style={{ height: 20 }}></span>
                <span className="placeholder col-8" style={{ height: 20 }}></span>
              </div>
            </div>
          ))
        ) : dates.length === 0 ? (
          <div className="py-5 text-center text-muted">
            <p>Chưa có dữ liệu sản lượng</p>
          </div>
        ) : (
          dates.map((date) => {
            const dayOutputs = grouped[date]
            const total = dayOutputs.reduce((s, o) => s + o.quantity, 0)
            return (
              <div key={date} className="card mb-3">
                <div className="card-header d-flex align-items-center justify-content-between py-2">
                  <span className="small fw-semibold text-muted text-uppercase">
                    {formatDateHeader(date)}
                  </span>
                  <span className="fw-bold small">{total.toLocaleString('vi-VN')} sản phẩm</span>
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
          })
        )}
      </div>
    </div>
  )
}
