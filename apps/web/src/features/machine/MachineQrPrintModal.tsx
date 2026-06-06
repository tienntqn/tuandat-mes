import { QRCodeCanvas } from 'qrcode.react'
import type { Machine } from './machine.api'
import { MACHINE_TYPE_LABELS, MACHINE_STATUS_LABELS } from './machine.api'

interface Props {
  machine: Machine
  printerName?: string
  widthMm?: number
  heightMm?: number
  onClose: () => void
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

// Modal xem trước + in tem QR cho 1 máy. QR mã hoá link tới trang chi tiết máy.
export function MachineQrPrintModal({ machine, printerName, widthMm = 50, heightMm = 30, onClose }: Props) {
  const value = `${window.location.origin}/machines/${machine.id}`
  // Kích thước QR theo cạnh nhỏ của tem (1mm ≈ 3.78px)
  const qrPx = Math.max(70, Math.round((Math.min(widthMm, heightMm) - 8) * 3.6))

  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header no-print">
            <h5 className="modal-title">In tem QR — {machine.code}</h5>
            <button onClick={onClose} type="button" className="btn-close"></button>
          </div>
          <div className="modal-body">
            {/* Vùng được in (khổ đúng bằng tem) */}
            <div
              className="qr-label-print mx-auto d-flex align-items-center gap-2 bg-white"
              style={{ width: `${widthMm}mm`, minHeight: `${heightMm}mm`, border: '1px solid #ddd', padding: '2mm', borderRadius: 4 }}
            >
              <QRCodeCanvas value={value} size={qrPx} includeMargin={false} level="M" />
              <div style={{ fontSize: 9, lineHeight: 1.25, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>{machine.name}</div>
                <div><strong>Mã:</strong> {machine.code}</div>
                <div><strong>Loại:</strong> {MACHINE_TYPE_LABELS[machine.type]}</div>
                <div><strong>Ngày mua:</strong> {fmtDate(machine.purchaseDate)}</div>
                <div><strong>Xưởng:</strong> {machine.factory?.name ?? '—'}</div>
                <div><strong>Trạng thái:</strong> {MACHINE_STATUS_LABELS[machine.status]}</div>
              </div>
            </div>
            {printerName && (
              <p className="text-muted small mt-3 mb-0 no-print text-center">
                Máy in cấu hình: <strong>{printerName}</strong> — đảm bảo đây là máy in mặc định của máy tính.
              </p>
            )}
          </div>
          <div className="modal-footer no-print">
            <button onClick={onClose} className="btn btn-outline-secondary">Đóng</button>
            <button onClick={() => window.print()} className="btn btn-primary text-white d-inline-flex align-items-center gap-1">
              <i className="fe fe-printer"></i> In tem
            </button>
          </div>
        </div>
      </div>

      {/* Khi in: chỉ hiện tem, đặt khổ giấy đúng kích thước tem */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .qr-label-print, .qr-label-print * { visibility: visible !important; }
        .qr-label-print { position: fixed; left: 0; top: 0; border: none !important; }
        @page { size: ${widthMm}mm ${heightMm}mm; margin: 1mm; }
      }`}</style>
    </div>
  )
}
