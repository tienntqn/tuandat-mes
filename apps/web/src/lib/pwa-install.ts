// Quản lý khả năng "Cài đặt ứng dụng" (PWA install) ở mức toàn cục.
// Bắt sự kiện beforeinstallprompt sớm (ngay khi import) để không bỏ lỡ.

let deferred: any = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export const canInstall = () => !!deferred

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  deferred.prompt()
  const choice = await deferred.userChoice
  if (choice?.outcome === 'accepted') deferred = null
  emit()
  return choice?.outcome === 'accepted'
}

// Đã chạy ở chế độ app (đã cài) → ẩn nút cài đặt
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
