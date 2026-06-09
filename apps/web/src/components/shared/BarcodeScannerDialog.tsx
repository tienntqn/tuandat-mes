import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Image as ImageIcon } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onResult: (text: string) => void
  title?: string
}

const READER_ID = 'barcode-reader-region'
const FILE_READER_ID = 'barcode-file-region'

// Trình duyệt có hỗ trợ camera streaming không (cần secure context: HTTPS hoặc localhost)
const cameraSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function'

/**
 * Hộp thoại quét mã QR / mã vạch.
 * - Ưu tiên camera trực tiếp (chỉ chạy khi HTTPS/localhost).
 * - Dự phòng: CHỤP/CHỌN ẢNH QR (dùng camera gốc của máy) — chạy được cả trên HTTP.
 */
export function BarcodeScannerDialog({ open, onClose, onResult, title = 'Quét mã QR / mã vạch' }: Props) {
  const [error, setError] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const canCamera = cameraSupported()

  useEffect(() => {
    if (!open) return
    setError('')
    if (!canCamera) {
      setError(
        'Trình duyệt không mở được camera trực tiếp (thường do trang chạy HTTP). ' +
          'Hãy dùng "Chụp / chọn ảnh QR" bên dưới, hoặc truy cập bằng HTTPS.',
      )
      return
    }

    let cancelled = false
    const scanner = new Html5Qrcode(READER_ID, { verbose: false })
    scannerRef.current = scanner

    const stop = async () => {
      try {
        if (scanner.getState && scanner.getState() === 2 /* SCANNING */) await scanner.stop()
        await scanner.clear()
      } catch {
        /* bỏ qua lỗi khi dừng */
      }
    }

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 170 } },
        (decoded) => {
          if (cancelled) return
          cancelled = true
          onResult(decoded.trim())
          stop().then(onClose)
        },
        () => {
          /* bỏ qua lỗi từng khung hình */
        },
      )
      .catch((e: any) => {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Bạn chưa cấp quyền camera cho trình duyệt.'
            : 'Không mở được camera: ' + (e?.message ?? e) + '. Hãy thử "Chụp / chọn ảnh QR".',
        )
      })

    return () => {
      cancelled = true
      void stop()
    }
  }, [open, onClose, onResult, canCamera])

  // Giải mã QR từ ảnh chụp/chọn (không cần camera streaming)
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng 1 file
    if (!file) return
    setError('')
    setFileBusy(true)
    const fileScanner = new Html5Qrcode(FILE_READER_ID, { verbose: false })
    try {
      const text = await fileScanner.scanFile(file, false)
      onResult(text.trim())
      onClose()
    } catch {
      setError('Không đọc được mã QR từ ảnh. Hãy chụp rõ, đủ sáng và lấy gọn mã QR trong khung.')
    } finally {
      try {
        await fileScanner.clear()
      } catch {
        /* ignore */
      }
      setFileBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3">
      <div className="w-full rounded-xl bg-card border shadow-xl flex flex-col" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="p-3">
          {error && <div className="alert alert-warning small">{error}</div>}
          {canCamera && !error && (
            <>
              <div id={READER_ID} style={{ width: '100%' }} />
              <p className="text-muted small text-center mt-2 mb-2">Đưa mã QR / mã vạch vào khung hình</p>
            </>
          )}

          {/* Dự phòng: chụp / chọn ảnh QR */}
          <div id={FILE_READER_ID} style={{ display: 'none' }} />
          <label className="btn btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 mb-0">
            <ImageIcon size={16} />
            {fileBusy ? 'Đang đọc ảnh...' : 'Chụp / chọn ảnh QR'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={fileBusy}
              onChange={handleFile}
            />
          </label>
        </div>
        <div className="px-4 py-3 border-t d-flex justify-content-end">
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary">Đóng</button>
        </div>
      </div>
    </div>
  )
}
