import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useMyStyles, useTodayOutput, useUpsertOutput, useOfflineSync } from './output.hooks'
import { STAGE_LABELS, STAGE_COLORS, type ProductionStage, type DailyOutput } from './output.api'
import { getOfflineQueueCount } from './lib/offline-store'

const STAGES: ProductionStage[] = ['CUTTING', 'SEWING', 'QC', 'PACKING']

const schema = z.object({
  styleId: z.string().min(1, 'Chọn mã hàng'),
  stage: z.enum(['CUTTING', 'SEWING', 'QC', 'PACKING']),
  quantity: z.string().min(1, 'Nhập số lượng').refine((v) => parseInt(v) >= 0, 'Số lượng không hợp lệ'),
})

type FormData = z.infer<typeof schema>

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function CutoffWarning({ cutoffHour, isPastCutoff }: { cutoffHour: number; isPastCutoff: boolean }) {
  const now = new Date()
  const hoursLeft = cutoffHour - now.getHours() - (now.getMinutes() > 0 ? 1 : 0)
  const showWarning = !isPastCutoff && hoursLeft <= 1

  if (isPastCutoff) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">Đã qua giờ khóa {cutoffHour}:00 — không thể nhập sản lượng hôm nay</span>
      </div>
    )
  }
  if (showWarning) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-700">
        <Clock className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">Còn ít hơn 1 giờ đến giờ khóa ({cutoffHour}:00)</span>
      </div>
    )
  }
  return null
}

function OutputProgress({
  output,
  plannedQty,
}: {
  output: DailyOutput | undefined
  plannedQty: number
}) {
  const actual = output?.quantity ?? 0
  const pct = plannedQty > 0 ? Math.min(100, Math.round((actual / plannedQty) * 100)) : null

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Đã nhập</span>
        <span className="font-semibold">{actual.toLocaleString('vi-VN')}</span>
      </div>
      {plannedQty > 0 && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kế hoạch</span>
            <span>{plannedQty.toLocaleString('vi-VN')}</span>
          </div>
          <Progress value={pct ?? 0} className="h-2" />
          <p className={cn('text-xs text-right font-medium', pct! >= 100 ? 'text-green-600' : pct! >= 80 ? 'text-amber-600' : 'text-red-600')}>
            {pct}%
          </p>
        </>
      )}
    </div>
  )
}

export default function OutputPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineCount, setOfflineCount] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { data: styles = [], isLoading: stylesLoading } = useMyStyles()
  const { data: today, isLoading: todayLoading, refetch: refetchToday } = useTodayOutput()
  const upsert = useUpsertOutput()
  const { sync } = useOfflineSync()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { styleId: '', stage: 'SEWING', quantity: '' },
  })

  // Theo dõi online/offline
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      await sync()
      const count = await getOfflineQueueCount()
      setOfflineCount(count)
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [sync])

  useEffect(() => {
    getOfflineQueueCount().then(setOfflineCount)
  }, [])

  const isPastCutoff = today?.isPastCutoff ?? false
  const cutoffHour = today?.cutoffHour ?? 19

  const watchedStyle = form.watch('styleId')
  const watchedStage = form.watch('stage')

  // Tìm output hiện tại cho style+stage đã chọn
  const currentOutput = today?.outputs.find(
    (o) => o.styleId === parseInt(watchedStyle) && o.stage === watchedStage,
  )

  // Tìm kế hoạch cho style đã chọn
  const currentPlan = today?.factoryPlans.find(
    (p) => p.companyPlan?.styleId === parseInt(watchedStyle),
  )
  const plannedQty = currentPlan
    ? Math.round(currentPlan.plannedQuantity / 20) // ước tính sản lượng ngày = tổng / 20 ngày sx
    : 0

  // Prefill số lượng nếu đã nhập trước đó
  useEffect(() => {
    if (currentOutput) {
      form.setValue('quantity', String(currentOutput.quantity))
    } else {
      form.setValue('quantity', '')
    }
  }, [currentOutput, form])

  const onSubmit = useCallback(
    async (data: FormData) => {
      await upsert.mutateAsync({
        styleId: parseInt(data.styleId),
        stage: data.stage as ProductionStage,
        quantity: parseInt(data.quantity),
      })
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2000)
      refetchToday()
      const count = await getOfflineQueueCount()
      setOfflineCount(count)
    },
    [upsert, refetchToday],
  )

  const isLoading = stylesLoading || todayLoading

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold">Nhập sản lượng</h1>
            {today && (
              <p className="text-xs text-muted-foreground">{formatDate(today.date)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Trạng thái online */}
            {isOnline ? (
              <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                <WifiOff className="h-3 w-3" /> Offline{offlineCount > 0 ? ` (${offlineCount})` : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetchToday()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Cảnh báo cutoff */}
        {today && (
          <CutoffWarning cutoffHour={cutoffHour} isPastCutoff={isPastCutoff} />
        )}

        {/* Form nhập sản lượng */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nhập sản lượng</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Chọn mã hàng */}
                <FormField
                  control={form.control}
                  name="styleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Mã hàng</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading || isPastCutoff}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Chọn mã hàng..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {styles.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)} className="py-3">
                              <div>
                                <p className="font-medium">{s.code}</p>
                                <p className="text-xs text-muted-foreground">{s.name}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Chọn công đoạn */}
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Công đoạn</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {STAGES.map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            disabled={isPastCutoff}
                            onClick={() => field.onChange(stage)}
                            className={cn(
                              'rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all',
                              field.value === stage
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50',
                              isPastCutoff && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            {STAGE_LABELS[stage]}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tiến độ hiện tại */}
                {watchedStyle && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <OutputProgress output={currentOutput} plannedQty={plannedQty} />
                  </div>
                )}

                {/* Nhập số lượng — input lớn dễ bấm */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Số lượng</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          disabled={isPastCutoff}
                          placeholder="0"
                          className={cn(
                            'w-full rounded-lg border-2 border-input bg-background px-4 py-4 text-4xl font-bold text-center tabular-nums focus:outline-none focus:border-primary transition-colors',
                            isPastCutoff && 'opacity-50 cursor-not-allowed',
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold"
                  disabled={isPastCutoff || upsert.isPending || isLoading}
                >
                  {upsert.isPending ? (
                    'Đang lưu...'
                  ) : submitted ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Đã lưu!
                    </span>
                  ) : (
                    'Lưu sản lượng'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Tổng kết hôm nay */}
        {today && today.outputs.length > 0 && (
          <Card>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Đã nhập hôm nay ({today.outputs.length})</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {today.outputs.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{o.style?.code ?? `Style #${o.styleId}`}</p>
                        <Badge variant="outline" className={cn('text-xs', STAGE_COLORS[o.stage])}>
                          {STAGE_LABELS[o.stage]}
                        </Badge>
                      </div>
                      <span className="text-lg font-bold">{o.quantity.toLocaleString('vi-VN')}</span>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </div>
    </div>
  )
}
