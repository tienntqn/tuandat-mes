import { Download, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <Download className="h-5 w-5 shrink-0 text-blue-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Cài Tuấn Đạt MES</p>
        <p className="text-xs text-muted-foreground">Dùng offline, nhanh hơn trên mobile</p>
      </div>
      <Button size="sm" onClick={install}>Cài</Button>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
