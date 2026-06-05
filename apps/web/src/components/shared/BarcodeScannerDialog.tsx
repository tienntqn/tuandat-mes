import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onResult: (text: string) => void
  title?: string
}

const READER_ID = 'barcode-reader-region'

/**
 * Hộp thoại quét mã QR / mã vạch bằng camera (ưu tiên camera sau).
 * Trả về chuỗi giải mã qua onResult rồi tự đóng. Tối ưu cho mobile.
 */
export function BarcodeScannerDialog({ open, onClose, onResult, title = 'Quét mã QR / mã vạch' }: Props) {
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')

    const scanner = new Html5Qrcode(READER_ID, { verbose: false })
    scannerRef.current = scanner

    const stop = async () => {
      try {
        // chỉ stop khi đang chạy để tránh warning
        if (scanner.getState && scanner.getState() === 2 /* SCANNING */) {
          await scanner.stop()
        }
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
            : 'Không mở được camera: ' + (e?.message ?? e),
        )
      })

    return () => {
      cancelled = true
      void stop()
    }
  }, [open, onClose, onResult])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3">
      <div className="w-full rounded-xl bg-card border shadow-xl flex flex-col" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="p-3">
          {error ? (
            <div className="alert alert-danger small mb-0">{error}</div>
          ) : (
            <>
              <div id={READER_ID} style={{ width: '100%' }} />
              <p className="text-muted small text-center mt-2 mb-0">Đưa mã QR / mã vạch vào khung hình</p>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t d-flex justify-content-end">
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary">Đóng</button>
        </div>
      </div>
    </div>
  )
}
