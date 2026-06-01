import { useState } from 'react'
import { useOutputHistory } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type DailyOutput } from './output.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function groupByDate(outputs: DailyOutput[]): Record<string, DailyOutput[]> {
  return outputs.reduce(
    (acc, o) => {
      const date = o.outputDate.slice(0, 10)
      if (!acc[date]) acc[date] = []
      acc[date].push(o)
      return acc
    },
    {} as Record<string, DailyOutput[]>,
  )
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Hôm nay'
  if (d.getTime() === yesterday.getTime()) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

export default function OutputHistoryPage() {
  const [days, setDays] = useState(7)
  const { data: outputs = [], isLoading } = useOutputHistory(days)

  const grouped = groupByDate(outputs)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Lịch sử sản lượng</h1>
          <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày qua</SelectItem>
              <SelectItem value="14">14 ngày qua</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))
        ) : dates.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>Chưa có dữ liệu sản lượng</p>
          </div>
        ) : (
          dates.map((date) => {
            const dayOutputs = grouped[date]
            const total = dayOutputs.reduce((s, o) => s + o.quantity, 0)
            return (
              <Card key={date}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {formatDateHeader(date)}
                    </CardTitle>
                    <span className="text-sm font-bold">{total.toLocaleString('vi-VN')} sản phẩm</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayOutputs.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className={cn('text-xs shrink-0', STAGE_COLORS[o.stage])}>
                          {STAGE_LABELS[o.stage]}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {o.style?.code ?? `Style #${o.styleId}`}
                        </span>
                      </div>
                      <span className="text-base font-bold ml-2">{o.quantity.toLocaleString('vi-VN')}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
