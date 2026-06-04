import { useState, useMemo } from 'react'
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useProgressReport } from './report.hooks'
import { type ProgressRow } from './report.api'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ColorSizeReportView } from './ColorSizeReportView'

const STAGE_LABELS: Record<string, string> = {
  CUTTING: 'Cắt',
  SEWING: 'May',
  QC: 'KCS',
  PACKING: 'Đóng gói',
}

const STAGES = ['', 'CUTTING', 'SEWING', 'QC', 'PACKING']

// Export CSV thuần trình duyệt — không cần thư viện
function exportCsv(rows: ProgressRow[]) {
  const headers = [
    'Xưởng', 'Chuyền', 'Mã hàng', 'Tên hàng', 'Công đoạn',
    'KH (SP)', 'TT (SP)', '% HT', 'Ngày BĐ', 'Deadline', 'Dự báo HT', 'Trạng thái',
  ]
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.factoryName,
        r.lineName,
        r.styleCode,
        `"${r.styleName}"`,
        STAGE_LABELS[r.stage] ?? r.stage,
        r.plannedQty,
        r.actualQty,
        r.pct,
        r.startDate,
        r.expectedFinishDate,
        r.estimatedFinishDate ?? '',
        r.isLate ? 'Chậm' : 'Đúng tiến độ',
      ].join(','),
    ),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bao-cao-tien-do-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function PctBadge({ pct, isLate }: { pct: number; isLate: boolean }) {
  if (isLate)
    return (
      <span className="badge bg-danger d-inline-flex align-items-center gap-1">
        <TrendingDown size={12} />
        {pct}%
      </span>
    )
  if (pct >= 100)
    return (
      <span className="badge bg-success d-inline-flex align-items-center gap-1">
        <TrendingUp size={12} />
        {pct}%
      </span>
    )
  return (
    <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
      <Minus size={12} />
      {pct}%
    </span>
  )
}

export default function ReportPage() {
  const [view, setView] = useState<'progress' | 'color-size'>('progress')
  const [stageFilter, setStageFilter] = useState('')

  const params = useMemo(
    () => ({ stage: stageFilter || undefined }),
    [stageFilter],
  )
  const { data: rows = [], isLoading } = useProgressReport(params)

  const lateCount = rows.filter((r) => r.isLate).length

  return (
    <PageWrapper
      title="Báo cáo tiến độ sản xuất"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Báo cáo' }]}
      actions={
        view === 'progress' ? (
          <div className="d-flex gap-2 no-print">
            <button onClick={() => window.print()} className="btn btn-outline-secondary btn-icon">
              <span><i className="fe fe-printer"></i></span> In / PDF
            </button>
            <button
              onClick={() => exportCsv(rows)}
              disabled={rows.length === 0}
              className="btn btn-outline-secondary btn-icon"
            >
              <span><i className="fe fe-download"></i></span> Xuất Excel
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Chuyển chế độ xem: tiến độ tổng vs bóc tách màu×size */}
      <ul className="nav nav-tabs mb-3 no-print">
        <li className="nav-item">
          <button className={`nav-link ${view === 'progress' ? 'active' : ''}`} onClick={() => setView('progress')}>Tiến độ tổng</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${view === 'color-size' ? 'active' : ''}`} onClick={() => setView('color-size')}>Theo Màu × Size</button>
        </li>
      </ul>

      {view === 'color-size' ? (
        <ColorSizeReportView />
      ) : (
      <>
      <p className="text-muted mb-3">
        So sánh kế hoạch vs thực tế theo chuyền / mã hàng / công đoạn
      </p>

      {/* Filters */}
      <div className="row mb-3 g-2 align-items-center">
        <div className="col-auto">
          <select
            className="form-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s ? STAGE_LABELS[s] : 'Tất cả công đoạn'}
              </option>
            ))}
          </select>
        </div>
        {lateCount > 0 && (
          <div className="col-auto">
            <span className="badge bg-danger d-inline-flex align-items-center gap-1 px-3 py-2">
              <AlertTriangle size={14} />
              {lateCount} mục chậm tiến độ
            </span>
          </div>
        )}
        {!isLoading && (
          <div className="col-auto ms-auto">
            <small className="text-muted">{rows.length} dòng</small>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  {['Xưởng', 'Chuyền', 'Mã hàng', 'Công đoạn', 'KH', 'TT', '% HT', 'Deadline', 'Dự báo', 'Trạng thái'].map((h) => (
                    <th key={h} className="text-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j}>
                          <span className="placeholder col-8 placeholder-sm"></span>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr
                      key={i}
                      className={row.isLate ? 'table-danger' : ''}
                    >
                      <td className="text-nowrap fw-medium">{row.factoryName}</td>
                      <td className="text-nowrap">{row.lineName}</td>
                      <td>
                        <div className="fw-medium">{row.styleCode}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: 120 }}>{row.styleName}</div>
                      </td>
                      <td className="text-nowrap">
                        <span className="badge bg-light text-dark border">
                          {STAGE_LABELS[row.stage] ?? row.stage}
                        </span>
                      </td>
                      <td className="text-nowrap tabular-nums">
                        {row.plannedQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="text-nowrap tabular-nums fw-medium">
                        {row.actualQty.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: 6 }}>
                            <div
                              className={`progress-bar ${row.isLate ? 'bg-danger' : 'bg-primary'}`}
                              style={{ width: `${Math.min(row.pct, 100)}%` }}
                            />
                          </div>
                          <PctBadge pct={row.pct} isLate={row.isLate} />
                        </div>
                      </td>
                      <td className="text-nowrap text-muted">
                        {row.expectedFinishDate}
                      </td>
                      <td className="text-nowrap">
                        {row.estimatedFinishDate ? (
                          <span
                            className={row.estimatedFinishDate > row.expectedFinishDate ? 'text-danger fw-medium' : 'text-success'}
                          >
                            {row.estimatedFinishDate}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-nowrap">
                        {row.isLate ? (
                          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                            <AlertTriangle size={12} />
                            Chậm
                          </span>
                        ) : (
                          <span className="badge bg-success-transparent text-success border border-success">
                            Đúng hạn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 4px 8px; }
        }
      `}</style>
      </>
      )}
    </PageWrapper>
  )
}
