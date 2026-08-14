import { useState } from 'react'
import { useMachineTimeline } from './machine-profile.hooks'
import { TIMELINE_TYPE_LABELS, TIMELINE_TYPE_COLOR, type TimelineEventType } from './machine-profile.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Lý lịch máy: gộp mọi sự kiện (bàn giao, hỏng hóc, sửa chữa, điều chuyển...) theo dòng thời gian. */
export function MachineTimelineCard({ machineId }: { machineId: number }) {
  const { data: events = [], isLoading } = useMachineTimeline(machineId)
  const [filter, setFilter] = useState<'' | TimelineEventType>('')

  const filtered = filter ? events.filter((e) => e.type === filter) : events

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="card-title mb-0">Lý lịch máy</h6>
        <select
          className="form-select form-select-sm"
          style={{ width: 210 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as TimelineEventType | '')}
        >
          <option value="">Tất cả sự kiện ({events.length})</option>
          {(Object.keys(TIMELINE_TYPE_LABELS) as TimelineEventType[]).map((t) => {
            const count = events.filter((e) => e.type === t).length
            return count > 0 ? <option key={t} value={t}>{TIMELINE_TYPE_LABELS[t]} ({count})</option> : null
          })}
        </select>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-center py-3 text-muted small">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-3 text-muted small">Chưa có sự kiện nào trong lý lịch máy</div>
        ) : (
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {filtered.map((e, i) => (
              <div key={`${e.type}-${e.refId}-${i}`} className="d-flex gap-2 mb-3">
                {/* Cột mốc thời gian */}
                <div className="d-flex flex-column align-items-center" style={{ width: 14 }}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: TIMELINE_TYPE_COLOR[e.type], marginTop: 5, flexShrink: 0,
                    }}
                  />
                  {i < filtered.length - 1 && <span style={{ width: 2, flex: 1, background: '#e9ecef', marginTop: 2 }} />}
                </div>
                <div className="flex-fill">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="fw-medium small">{e.title}</div>
                    <div className="text-muted small text-nowrap">{fmtDate(e.date)}</div>
                  </div>
                  <div className="small text-muted">
                    <span className="badge" style={{ background: `${TIMELINE_TYPE_COLOR[e.type]}22`, color: TIMELINE_TYPE_COLOR[e.type] }}>
                      {TIMELINE_TYPE_LABELS[e.type]}
                    </span>
                    {e.documentNo && <span className="ms-2"><code>{e.documentNo}</code></span>}
                  </div>
                  {e.description && <div className="small text-muted mt-1">{e.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
