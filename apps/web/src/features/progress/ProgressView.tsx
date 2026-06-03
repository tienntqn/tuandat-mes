import { useState } from 'react'
import { useProgress } from './progress.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useFactories } from '@/features/factory/factory.hooks'
import { useStylesActive } from '@/features/style/style.hooks'

interface Props {
  stage: string
  title: string
}

function ProgressBar({ pct, late }: { pct: number; late: boolean }) {
  const color = late ? 'bg-red-500' : pct >= 100 ? 'bg-green-500' : 'bg-primary'
  return (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: 140 }}>
      <div className="flex-grow-1" style={{ background: '#eee', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div className={color} style={{ width: `${Math.min(pct, 100)}%`, height: '100%' }} />
      </div>
      <small className="text-muted" style={{ width: 38 }}>{pct}%</small>
    </div>
  )
}

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export function ProgressView({ stage, title }: Props) {
  const [factoryId, setFactoryId] = useState<number | undefined>()
  const [styleId, setStyleId] = useState<number | undefined>()

  const { data: factoriesData } = useFactories({ pageSize: 200 })
  const factories = factoriesData?.data ?? []
  const { data: styles = [] } = useStylesActive()

  const { data = [], isLoading, refetch } = useProgress(stage, factoryId, styleId)

  const totalPlanned = data.reduce((s, r) => s + r.plannedQty, 0)
  const totalActual = data.reduce((s, r) => s + r.actualQty, 0)
  const overallPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0
  const lateCount = data.filter((r) => r.isLate).length

  return (
    <PageWrapper
      title={title}
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Theo dõi tiến độ' }, { label: title }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      <div className="row mb-3">
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">Kế hoạch</small><span className="fw-bold">{totalPlanned.toLocaleString()}</span></div></div></div>
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">Thực tế</small><span className="fw-bold">{totalActual.toLocaleString()}</span></div></div></div>
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">Tiến độ chung</small><span className="fw-bold">{overallPct}%</span></div></div></div>
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">Chuyền chậm</small><span className="fw-bold text-danger">{lateCount}</span></div></div></div>
      </div>

      {/* Bộ lọc */}
      <div className="row mb-3">
        <div className="col-auto">
          <select
            className="form-select"
            value={factoryId ?? ''}
            onChange={(e) => setFactoryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Tất cả xưởng</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={styleId ?? ''}
            onChange={(e) => setStyleId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Tất cả mã hàng</option>
            {styles.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Xưởng</th>
                  <th>Chuyền</th>
                  <th>Mã hàng</th>
                  <th className="text-end">Kế hoạch</th>
                  <th className="text-end">Thực tế</th>
                  <th style={{ width: 180 }}>Tiến độ</th>
                  <th>Dự kiến xong</th>
                  <th>Hạn</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có dữ liệu kế hoạch/sản lượng</td></tr>
                ) : (
                  data.map((r, i) => (
                    <tr key={`${r.lineId}-${r.styleId}-${r.stage}-${i}`} className={r.isLate ? 'table-danger' : ''}>
                      <td>{r.factoryName}</td>
                      <td>{r.lineName}</td>
                      <td><code className="text-primary me-1">{r.styleCode}</code>{r.styleName}</td>
                      <td className="text-end">{r.plannedQty.toLocaleString()}</td>
                      <td className="text-end fw-medium">{r.actualQty.toLocaleString()}</td>
                      <td><ProgressBar pct={r.pct} late={r.isLate} /></td>
                      <td className={r.isLate ? 'text-danger' : ''}>{formatDate(r.estimatedFinishDate)}</td>
                      <td>{formatDate(r.expectedFinishDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
