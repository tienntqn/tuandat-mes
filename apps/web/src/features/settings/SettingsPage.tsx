import { useState } from 'react'
import { useReportSettings } from '@/features/report/report.hooks'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import { Clock, AlertTriangle, Info } from 'lucide-react'

// Settings hiện tại là đọc từ env (OUTPUT_CUTOFF_HOUR, ALERT_SLOW_PCT)
// Màn hình này cho Admin xem + hướng dẫn cách thay đổi
// Có thể mở rộng sau: lưu vào DB và cho phép edit qua API

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono">
      {children}
    </span>
  )
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useReportSettings()
  const { user } = useAuthStore()
  const { toast } = useToast()

  const isAdmin = user?.roles.includes('ADMIN') ?? false

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        Bạn không có quyền truy cập trang này.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý các thông số vận hành</p>
      </div>

      {/* Cutoff time */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Giờ khoá nhập sản lượng</CardTitle>
          </div>
          <CardDescription>
            Sau giờ này tổ trưởng không thể nhập/sửa sản lượng của ngày hôm đó
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold tabular-nums">
                {settings?.cutoffHour ?? 19}:00
              </span>
              <div className="text-sm text-muted-foreground">
                <p>Giá trị hiện tại</p>
                <p className="mt-1">
                  Cấu hình qua biến môi trường:{' '}
                  <InfoBadge>OUTPUT_CUTOFF_HOUR</InfoBadge>
                </p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Để thay đổi giờ khoá, cập nhật biến <InfoBadge>OUTPUT_CUTOFF_HOUR</InfoBadge> trong file{' '}
              <InfoBadge>.env</InfoBadge> của server API và khởi động lại service.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert threshold */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Ngưỡng cảnh báo tiến độ chậm</CardTitle>
          </div>
          <CardDescription>
            Hệ thống cảnh báo khi % thực tế &lt; ngưỡng này so với % kỳ vọng theo timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold tabular-nums">
                {settings?.alertSlowPct ?? 80}%
              </span>
              <div className="text-sm text-muted-foreground">
                <p>Của tiến độ kỳ vọng</p>
                <p className="mt-1">
                  Cấu hình qua:{' '}
                  <InfoBadge>ALERT_SLOW_PCT</InfoBadge>
                </p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Ví dụ: ngưỡng 80% nghĩa là nếu kỳ vọng hoàn thành 50% nhưng thực tế chỉ đạt &lt;40%
              thì hệ thống hiển thị cảnh báo đỏ. Cập nhật biến{' '}
              <InfoBadge>ALERT_SLOW_PCT</InfoBadge> trong file <InfoBadge>.env</InfoBadge>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Thông tin hệ thống */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            {[
              ['Phiên bản', 'Tuấn Đạt MES v1.0'],
              ['Tech Stack', 'NestJS + React + PostgreSQL'],
              ['Người dùng hiện tại', user?.fullName ?? '—'],
              ['Vai trò', user?.roles.join(', ') ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
