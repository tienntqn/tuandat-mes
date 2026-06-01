import { useRef, useState, useEffect } from 'react'
import { Bell, AlertTriangle, Wrench, ArrowRightLeft, TrendingDown } from 'lucide-react'
import { useAlerts } from '@/features/report/report.hooks'
import { type AlertItem } from '@/features/report/report.api'
import { cn } from '@/lib/utils'

const ALERT_ICONS = {
  MACHINE_MAINTENANCE: Wrench,
  TRANSFER_PENDING: ArrowRightLeft,
  SLOW_PROGRESS: TrendingDown,
  LATE_ORDER: AlertTriangle,
}

const SEVERITY_CLASSES: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-50',
  MEDIUM: 'border-l-amber-500 bg-amber-50',
  LOW: 'border-l-blue-500 bg-blue-50',
}

const SEVERITY_ICON_CLASSES: Record<string, string> = {
  HIGH: 'text-red-500',
  MEDIUM: 'text-amber-500',
  LOW: 'text-blue-500',
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const Icon = ALERT_ICONS[alert.type] ?? AlertTriangle
  return (
    <div className={cn('flex gap-3 p-3 border-l-2 rounded-sm', SEVERITY_CLASSES[alert.severity])}>
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', SEVERITY_ICON_CLASSES[alert.severity])} />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
      </div>
    </div>
  )
}

export function NotificationCenter() {
  const { data: alerts = [] } = useAlerts()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const highCount = alerts.filter((a) => a.severity === 'HIGH').length
  const totalCount = alerts.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
        title="Thông báo & cảnh báo"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
              highCount > 0 ? 'bg-red-500' : 'bg-amber-500',
            )}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Cảnh báo hệ thống</h3>
            {totalCount > 0 && (
              <span
                className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full text-white',
                  highCount > 0 ? 'bg-red-500' : 'bg-amber-500',
                )}
              >
                {totalCount}
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Không có cảnh báo nào
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {alerts.map((alert, i) => (
                  <AlertRow key={i} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
