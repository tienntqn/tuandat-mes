import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { StyleForLine } from './output.api'

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`
// Khóa giá trị cho chế độ nhập TỔNG (không theo màu/size)
export const TOTAL_KEY = 'total'

export interface MatrixCell {
  colorId: number | null
  sizeId: number | null
  quantity: number
}

interface Props {
  style: StyleForLine
  // Giá trị ban đầu theo key `${colorId}:${sizeId}`
  initialValues: Record<string, string>
  isPastCutoff: boolean
  isSaving: boolean
  saveLabel: string
  onSave: (cells: MatrixCell[]) => Promise<void> | void
}

// Thẻ nhập sản lượng theo ma trận Màu × Size cho 1 mã hàng (dùng chung cho Chuyền/Cắt/KCS).
// Tận dụng tối đa chiều rộng để dễ nhập trên mobile.
export function OutputMatrixCard({ style, initialValues, isPastCutoff, isSaving, saveLabel, onSave }: Props) {
  const colors = (style.styleColors ?? []).map((sc) => sc.color).filter((c): c is NonNullable<typeof c> => !!c)
  const sizes = (style.styleSizes ?? [])
    .map((ss) => ss.size)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  // Chế độ TỔNG: mã hàng tắt quản lý theo màu/size → chỉ nhập 1 ô tổng/ngày
  const totalMode = style.trackByColorSize === false
  const hasMatrix = colors.length > 0 && sizes.length > 0

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [saved, setSaved] = useState(false)

  // Đồng bộ lại khi dữ liệu hôm nay thay đổi (refetch)
  useEffect(() => {
    setValues(initialValues)
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.id, JSON.stringify(initialValues)])

  const markSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ----- Chế độ TỔNG -----
  if (totalMode) {
    const handleSaveTotal = async () => {
      const q = parseInt(values[TOTAL_KEY] || '0') || 0
      await onSave([{ colorId: null, sizeId: null, quantity: q }])
      markSaved()
    }
    return (
      <div className="card mb-3">
        <div className="card-header py-2">
          <div className="fw-bold small">{style.code}</div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{style.name}</div>
        </div>
        <div className="card-body py-3">
          <label className="form-label small text-muted">Tổng sản lượng hôm nay</label>
          <input type="number" inputMode="numeric" min={0} disabled={isPastCutoff}
            className="form-control form-control-lg text-center"
            value={values[TOTAL_KEY] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [TOTAL_KEY]: e.target.value.replace(/[^\d]/g, '') }))} />
          {!isPastCutoff && (
            <button className="btn btn-primary w-100 mt-3" disabled={isSaving} onClick={handleSaveTotal}>
              {saved ? <span className="d-flex align-items-center justify-content-center gap-1"><CheckCircle2 size={16} /> Đã lưu</span> : isSaving ? 'Đang lưu...' : saveLabel}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!hasMatrix) {
    return (
      <div className="card mb-3"><div className="card-body text-center text-muted py-4">
        <p className="mb-0">Mã hàng <b>{style.code}</b> chưa khai báo Màu/Size.</p>
        <small>Báo phòng kế hoạch thêm Màu/Size cho mã hàng này.</small>
      </div></div>
    )
  }

  const cellVal = (c: number, s: number) => values[cellKey(c, s)] ?? ''
  const setCell = (c: number, s: number, val: string) =>
    setValues((v) => ({ ...v, [cellKey(c, s)]: val.replace(/[^\d]/g, '') }))
  const colTotal = (sizeId: number) => colors.reduce((sum, c) => sum + (parseInt(cellVal(c.id, sizeId) || '0') || 0), 0)
  const rowTotal = (colorId: number) => sizes.reduce((sum, s) => sum + (parseInt(cellVal(colorId, s.id) || '0') || 0), 0)
  const grandTotal = colors.reduce((sum, c) => sum + rowTotal(c.id), 0)

  const handleSave = async () => {
    const cells: MatrixCell[] = colors
      .flatMap((c) => sizes.map((s) => ({ colorId: c.id, sizeId: s.id, raw: values[cellKey(c.id, s.id)] })))
      .filter((x) => x.raw !== undefined && x.raw !== '')
      .map((x) => ({ colorId: x.colorId, sizeId: x.sizeId, quantity: parseInt(x.raw || '0') || 0 }))
    await onSave(cells)
    markSaved()
  }

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <div className="fw-bold small">{style.code}</div>
        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{style.name}</div>
      </div>
      <div className="card-body py-3 px-2">
        <div className="table-responsive border" style={{ borderRadius: 4 }}>
          <table className="table table-sm table-bordered mb-0 text-center" style={{ width: '100%' }}>
            <thead className="thead-light">
              <tr>
                <th className="text-start" style={{ minWidth: 84 }}>Màu \ Size</th>
                {sizes.map((s) => <th key={s.id}>{s.code}</th>)}
                <th>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id}>
                  <td className="text-start">
                    <span className="d-inline-flex align-items-center gap-1">
                      <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid #ccc', background: c.hex ?? '#fff', display: 'inline-block' }} />
                      <span className="text-truncate" style={{ maxWidth: 64 }}>{c.name}</span>
                    </span>
                  </td>
                  {sizes.map((s) => (
                    <td key={s.id} style={{ padding: 2 }}>
                      <input type="number" inputMode="numeric" min={0} disabled={isPastCutoff}
                        className="form-control form-control-sm text-center px-1" style={{ width: '100%', minWidth: 44 }}
                        value={cellVal(c.id, s.id)}
                        onChange={(e) => setCell(c.id, s.id, e.target.value)} />
                    </td>
                  ))}
                  <td className="fw-medium align-middle">{rowTotal(c.id).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="thead-light">
                <td className="text-start fw-semibold">Tổng</td>
                {sizes.map((s) => <td key={s.id} className="fw-medium">{colTotal(s.id).toLocaleString()}</td>)}
                <td className="fw-bold text-primary">{grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!isPastCutoff && (
          <button className="btn btn-primary w-100 mt-3" disabled={isSaving} onClick={handleSave}>
            {saved ? <span className="d-flex align-items-center justify-content-center gap-1"><CheckCircle2 size={16} /> Đã lưu</span> : isSaving ? 'Đang lưu...' : saveLabel}
          </button>
        )}
      </div>
    </div>
  )
}
