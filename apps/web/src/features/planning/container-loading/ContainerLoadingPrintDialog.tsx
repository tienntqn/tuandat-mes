import { X, Printer } from 'lucide-react'
import { buildLoadingSequence } from './container-loading.utils'
import type { PackingSummary } from './container-loading.types'

interface Props {
  open: boolean
  packingResult: PackingSummary | null
  onClose: () => void
}

const ROTATED_LABEL: Record<'true' | 'false', string> = { true: 'Xoay ngang', false: 'Bình thường' }
// Kích thước thùng carton hiển thị theo cm cho dễ đọc với nhân viên — dữ liệu gốc lưu theo mét
const CM_PER_M = 100

// Phiếu hướng dẫn xếp container theo vị trí chiều sâu (trong ra cửa) — mirror PackingListDialog/RepairProposalPrint.
export function ContainerLoadingPrintDialog({ open, packingResult, onClose }: Props) {
  if (!open || !packingResult) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print-dialog-backdrop">
      <div className="w-full max-w-3xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto print-dialog-box">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10 no-print">
          <h2 className="font-bold text-lg">Phiếu hướng dẫn xếp container</h2>
          <div className="d-flex gap-2 align-items-center">
            <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1">
              <Printer size={14} /> In / PDF
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="p-5 container-loading-print">
          <div className="text-center mb-3">
            <div className="fw-bold text-uppercase" style={{ fontSize: 18 }}>Phiếu hướng dẫn xếp container</div>
            <div className="text-muted small">Công ty Cổ phần Tuấn Đạt</div>
          </div>

          <div className="row g-2 mb-4" style={{ fontSize: 14 }}>
            <div className="col-6"><strong>Loại container:</strong> {packingResult.containerTypeCode}</div>
            <div className="col-6"><strong>Kích thước:</strong> {packingResult.containerLength.toFixed(3)} x {packingResult.containerWidth.toFixed(3)} x {packingResult.containerHeight.toFixed(3)} m</div>
            <div className="col-6"><strong>Số container cần dùng:</strong> {packingResult.containersUsed}</div>
            <div className="col-6"><strong>Tổng thùng đã xếp:</strong> {packingResult.totalCartonsPlaced.toLocaleString('vi-VN')} / {packingResult.totalCartonsRequested.toLocaleString('vi-VN')}</div>
          </div>

          {packingResult.containers.map((c) => {
            const steps = buildLoadingSequence(c)
            return (
              <div key={c.index} className="mb-4">
                {/* Chỉ giữ tiêu đề dính liền bảng ngay sau nó (tránh tiêu đề đứng lẻ loi cuối trang) — KHÔNG
                    dùng pageBreakInside:'avoid' cho cả khối, vì bảng 1 container có thể dài hơn 1 trang: ép
                    "không được ngắt trang bên trong" sẽ khiến cả khối bị đẩy nguyên sang trang sau, bỏ trống
                    gần hết trang hiện tại. */}
                <div className="fw-semibold mb-2" style={{ fontSize: 15, breakAfter: 'avoid' }}>
                  Container {c.index} — Hiệu suất sử dụng thể tích: {c.utilizationPercent.toFixed(1)}%
                </div>
                <table className="table table-sm table-bordered mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: 60 }}>Vị trí</th>
                      <th style={{ width: 110 }}>Cách trong cùng (m)</th>
                      <th>Loại thùng</th>
                      <th style={{ width: 150 }}>Kích thước D×R×C (cm)</th>
                      <th style={{ width: 110 }}>Hướng xếp</th>
                      <th style={{ width: 100 }}>SL xếp chồng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step) =>
                      step.rows.map((row, ri) => (
                        <tr key={`${step.step}-${row.cartonId}-${row.rotated}`}>
                          {ri === 0 && (
                            <>
                              <td rowSpan={step.rows.length} className="align-middle text-center fw-medium">{step.step}</td>
                              <td rowSpan={step.rows.length} className="align-middle text-center">{step.x.toFixed(3)}</td>
                            </>
                          )}
                          <td>
                            <span className="d-inline-flex align-items-center gap-1">
                              <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid #ccc', background: row.color, display: 'inline-block', flexShrink: 0 }} />
                              {row.label}
                            </span>
                          </td>
                          <td>{(row.length * CM_PER_M).toFixed(1)} × {(row.width * CM_PER_M).toFixed(1)} × {(row.height * CM_PER_M).toFixed(1)}</td>
                          <td>{ROTATED_LABEL[row.rotated ? 'true' : 'false']}</td>
                          <td className="text-center fw-medium">{row.count}</td>
                        </tr>
                      )),
                    )}
                    {steps.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted">Không có thùng nào được xếp trong container này.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}

          <div className="text-muted small mt-2">
            Thùng carton không chịu được người đứng lên trên. Vị trí 1 = điểm trong cùng (xa cửa nhất), xếp trước.
            Xếp lần lượt từng vị trí từ trong ra cửa — tại mỗi vị trí xếp kín bề rộng VÀ xếp chồng đủ số lượng ở cột
            "SL xếp chồng" (từ sàn lên) rồi mới chuyển sang vị trí kế tiếp, để luôn còn sàn trống phía cửa cho công
            nhân đứng, không phải giẫm lên thùng đã xếp.
          </div>

          <div className="d-flex justify-content-between mt-4 text-center">
            <div style={{ width: '45%' }}><div className="fw-medium">Người xếp hàng</div><div className="text-muted small">(Ký, ghi rõ họ tên)</div><div style={{ height: 60 }} /></div>
            <div style={{ width: '45%' }}><div className="fw-medium">Người kiểm tra</div><div className="text-muted small">(Ký, ghi rõ họ tên)</div><div style={{ height: 60 }} /></div>
          </div>
        </div>
      </div>

      <style>{`@media print {
        body * { visibility: hidden; }
        .container-loading-print, .container-loading-print * { visibility: visible; }
        /* .print-dialog-backdrop dùng position: fixed — trình duyệt sẽ VẼ LẠI mọi phần tử fixed trên MỖI trang
           khi in nhiều trang, khiến phần header (tiêu đề + bảng tóm tắt) bị chồng lặp lên các dòng dữ liệu ở
           trang 2 trở đi. Bỏ fixed/sticky và giới hạn chiều cao của các thẻ cha khi in để nội dung chỉ xuất
           hiện đúng 1 lần, chảy tự nhiên qua nhiều trang. */
        .print-dialog-backdrop, .print-dialog-box { position: static !important; overflow: visible !important; max-height: none !important; }
        .container-loading-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
        .no-print { display: none !important; }
      }`}</style>
    </div>
  )
}
