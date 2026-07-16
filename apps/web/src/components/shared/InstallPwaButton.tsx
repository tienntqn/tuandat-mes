import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { canInstall, subscribe, promptInstall, isStandalone, isIOS } from '@/lib/pwa-install'

interface Props {
  className?: string
  label?: string
}

// Nút "Cài đặt ứng dụng" (PWA). Android/Chrome/Edge: gọi prompt cài đặt.
// iOS Safari: hiện hướng dẫn Thêm vào Màn hình chính (iOS không hỗ trợ prompt tự động).
export function InstallPwaButton({ className, label = 'Cài đặt ứng dụng' }: Props) {
  const [installable, setInstallable] = useState(canInstall())
  const [showIos, setShowIos] = useState(false)

  useEffect(() => subscribe(() => setInstallable(canInstall())), [])

  if (isStandalone()) return null
  const ios = isIOS()
  if (!installable && !ios) return null // trình duyệt chưa sẵn sàng cài (hoặc đã cài)

  const onClick = async () => {
    if (installable) await promptInstall()
    else setShowIos(true)
  }

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn btn-sm btn-primary text-white d-inline-flex align-items-center gap-1'}
        onClick={onClick}
        title="Cài đặt ứng dụng lên thiết bị"
      >
        <Download size={15} /> <span className="d-none d-lg-inline">{label}</span>
      </button>

      {showIos && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3">
          <div className="w-full rounded-xl bg-card border shadow-xl" style={{ maxWidth: 400 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-bold">Cài đặt lên iPhone / iPad</h2>
              <button onClick={() => setShowIos(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-4 small">
              <p className="mb-2">Trên Safari, làm theo các bước:</p>
              <ol className="ps-3 mb-2" style={{ lineHeight: 1.8 }}>
                <li>Bấm nút <Share size={14} className="d-inline" /> <b>Chia sẻ</b> (thanh dưới cùng).</li>
                <li>Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen).</li>
                <li>Bấm <b>Thêm</b> — biểu tượng app sẽ xuất hiện ngoài màn hình.</li>
              </ol>
              <p className="text-muted mb-0">Lưu ý: phải mở bằng <b>Safari</b> (không phải Chrome) trên iOS.</p>
            </div>
            <div className="px-4 py-3 border-t d-flex justify-content-end">
              <button onClick={() => setShowIos(false)} className="btn btn-sm btn-outline-secondary">Đã hiểu</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
