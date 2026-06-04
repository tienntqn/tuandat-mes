import { useMemo, useState } from 'react'
import { useColorSizeReport } from './report.hooks'
import { type ColorSizeStyle } from './report.api'
import { useStylesActive } from '@/features/style/style.hooks'

const STAGE_LABELS: Record<string, string> = {
  CUTTING: 'Cắt',
  SEWING: 'May',
  QC: 'KCS',
  PACKING: 'Đóng gói',
}
const STAGES = ['CUTTING', 'SEWING', 'QC', 'PACKING']

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`

function pctClass(pct: number) {
  if (pct >= 100) return 'text-success fw-semibold'
  if (pct >= 70) return 'text-dark'
  if (pct > 0) return 'text-warning'
  return 'text-muted'
}

function StyleMatrix({ s }: { s: ColorSizeStyle }) {
  const produced = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of s.cells) m[cellKey(c.colorId, c.sizeId)] = c.produced
    return m
  }, [s])
  const ordered = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of s.cells) m[cellKey(c.colorId, c.sizeId)] = c.ordered
    return m
  }, [s])

  const overallPct = s.totalOrdered > 0 ? Math.round((s.totalProduced / s.totalOrdered) * 100) : 0

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <div>
          <span className="fw-bold">{s.styleCode}</span>
          <span className="text-muted ms-2">{s.styleName}</span>
        </div>
        <div className="small">
          <span className="text-muted">Đã SX / Đã đặt: </span>
          <span className="fw-semibold">{s.totalProduced.toLocaleString('vi-VN')}</span>
          <span className="text-muted"> / {s.totalOrdered.toLocaleString('vi-VN')}</span>
          <span className={`badge ms-2 ${overallPct >= 100 ? 'bg-success' : overallPct >= 70 ? 'bg-primary' : 'bg-secondary'}`}>{overallPct}%</span>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm table-bordered text-center mb-0" style={{ fontSize: 13 }}>
            <thead className="thead-light">
              <tr>
                <th className="text-start" style={{ minWidth: 110 }}>Màu \ Size</th>
                {s.sizes.map((sz) => <th key={sz.id}>{sz.code}</th>)}
                <th>Tổng SX</th>
                <th>Đã đặt</th>
              </tr>
            </thead>
            <tbody>
              {s.colors.map((c) => {
                const rowProd = s.sizes.reduce((sum, sz) => sum + (produced[cellKey(c.id, sz.id)] || 0), 0)
                const rowOrd = s.sizes.reduce((sum, sz) => sum + (ordered[cellKey(c.id, sz.id)] || 0), 0)
                return (
                  <tr key={c.id}>
                    <td className="text-start">
                      <span className="d-inline-flex align-items-center gap-1">
                        <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid #ccc', background: c.hex ?? '#fff', display: 'inline-block' }} />
                        {c.name}
                      </span>
                    </td>
                    {s.sizes.map((sz) => {
                      const prod = produced[cellKey(c.id, sz.id)] || 0
                      const ord = ordered[cellKey(c.id, sz.id)] || 0
                      const pct = ord > 0 ? Math.round((prod / ord) * 100) : 0
                      return (
                        <td key={sz.id} className={pctClass(pct)} title={ord ? `Đã đặt: ${ord}` : undefined}>
                          {prod ? prod.toLocaleString('vi-VN') : '—'}
                        </td>
                      )
                    })}
                    <td className="fw-medium">{rowProd.toLocaleString('vi-VN')}</td>
                    <td className="text-muted">{rowOrd.toLocaleString('vi-VN')}</td>
                  </tr>
                )
              })}
              <tr className="thead-light">
                <td className="text-start fw-semibold">Tổng theo size</td>
                {s.sizes.map((sz) => {
                  const colProd = s.colors.reduce((sum, c) => sum + (produced[cellKey(c.id, sz.id)] || 0), 0)
                  return <td key={sz.id} className="fw-medium">{colProd.toLocaleString('vi-VN')}</td>
                })}
                <td className="fw-bold text-primary">{s.totalProduced.toLocaleString('vi-VN')}</td>
                <td className="fw-bold text-muted">{s.totalOrdered.toLocaleString('vi-VN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ColorSizeReportView() {
  const [stage, setStage] = useState('SEWING')
  const [styleId, setStyleId] = useState<number>(0)
  const { data: styles = [] } = useStylesActive()

  const params = useMemo(() => ({ stage, styleId: styleId || undefined }), [stage, styleId])
  const { data: rows = [], isLoading } = useColorSizeReport(params)

  return (
    <div>
      <div className="row g-2 mb-3 align-items-center">
        <div className="col-auto">
          <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>Công đoạn: {STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <select className="form-select" value={styleId} onChange={(e) => setStyleId(+e.target.value)}>
            <option value={0}>Tất cả mã hàng</option>
            {styles.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </div>
        {!isLoading && <div className="col-auto ms-auto"><small className="text-muted">{rows.length} mã hàng</small></div>}
      </div>

      {isLoading ? (
        <div className="text-center py-5 text-muted">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="card"><div className="card-body text-center py-5 text-muted">Chưa có dữ liệu màu/size cho công đoạn này</div></div>
      ) : (
        rows.map((s) => <StyleMatrix key={s.styleId} s={s} />)
      )}
    </div>
  )
}
