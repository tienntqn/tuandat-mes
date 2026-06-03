import { cn } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: 'Hoạt động', class: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Ngừng hoạt động', class: 'bg-gray-100 text-gray-600' },
  OPEN: { label: 'Mở', class: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Đang sản xuất', class: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Hoàn thành', class: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Hủy', class: 'bg-red-100 text-red-700' },
  PENDING: { label: 'Chờ giao', class: 'bg-gray-100 text-gray-600' },
  PARTIAL: { label: 'Giao một phần', class: 'bg-yellow-100 text-yellow-700' },
  DELIVERED: { label: 'Đã giao', class: 'bg-green-100 text-green-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, class: 'bg-secondary text-secondary-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.class)}>
      {config.label}
    </span>
  )
}
