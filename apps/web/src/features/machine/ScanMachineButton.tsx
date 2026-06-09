import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode } from 'lucide-react'
import { BarcodeScannerDialog } from '@/components/shared/BarcodeScannerDialog'
import { toast } from '@/lib/toast'

interface Props {
  className?: string
  label?: string
}

// Nút quét QR máy: giải mã QR (dạng .../machines/{id}) rồi mở trang chi tiết máy.
export function ScanMachineButton({ className, label = 'Quét QR máy' }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const onResult = useCallback(
    (text: string) => {
      const m = text.match(/machines\/(\d+)/) || text.match(/^(\d+)$/)
      if (m) navigate(`/machines/${m[1]}`)
      else toast.error('Mã QR không hợp lệ (không phải QR máy)')
    },
    [navigate],
  )

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn btn-primary btn-sm text-white d-inline-flex align-items-center gap-1'}
        onClick={() => setOpen(true)}
      >
        <QrCode size={16} /> {label}
      </button>
      <BarcodeScannerDialog open={open} onClose={() => setOpen(false)} onResult={onResult} title="Quét QR máy" />
    </>
  )
}
