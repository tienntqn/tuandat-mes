import { QRCodeCanvas } from 'qrcode.react'
import { Printer } from 'lucide-react'

interface Props {
  // Nội dung QR (vd link tới trang chi tiết máy)
  value: string
  size?: number
  // Tiêu đề in kèm (vd mã + tên máy)
  title?: string
  subtitle?: string
  showPrint?: boolean
}

// Mã QR + nút in. Khi in chỉ hiện vùng .qr-print.
export function QRCode({ value, size = 160, title, subtitle, showPrint = true }: Props) {
  return (
    <div className="d-flex flex-column align-items-center gap-2">
      <div className="qr-print d-flex flex-column align-items-center p-3 border bg-white" style={{ borderRadius: 8 }}>
        <QRCodeCanvas value={value} size={size} includeMargin level="M" />
        {title && <div className="fw-bold mt-2 text-center">{title}</div>}
        {subtitle && <div className="text-muted small text-center">{subtitle}</div>}
      </div>
      {showPrint && (
        <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 no-print">
          <Printer size={14} /> In mã QR
        </button>
      )}
    </div>
  )
}
