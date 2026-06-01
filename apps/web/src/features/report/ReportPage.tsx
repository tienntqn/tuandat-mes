import { useState, useMemo } from 'react'
import { Download, Printer, AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useProgressReport } from './report.hooks'
import { type ProgressRow } from './report.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  CUTTING: 'Cắt',
  SEWING: 'May',
  QC: 'KCS',
  PACKING: 'Đóng gói',
}

const STAGES = ['', 'CUTTING', 'SEWING', 'QC', 'PACKING']

// Export CSV thuần trình duyệt — không cần thư viện
function exportCsv(rows: ProgressRow[]) {
  const headers = [
    'Xưởng', 'Chuyền', 'Mã hàng', 'Tên hàng', 'Công đoạn',
    'KH (SP)', 'TT (SP)', '% HT', 'Ngày BĐ', 'Deadline', 'Dự báo HT', 'Trạng thái',
  ]
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.factoryName,
        r.lineName,
        r.styleCode,
        `"${r.styleName}"`,
        STAGE_LABELS[r.stage] ?? r.stage,
        r.plannedQty,
        r.actualQty,
        r.pct,
        r.startDate,
        r.expectedFinishDate,
        r.estimatedFinishDate ?? '',
        r.isLate ? 'Chậm' : 'Đúng tiến độ',
      ].join(','),
    ),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bao-cao-tien-do-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function PctBadge({ pct, isLate }: { pct: number; isLate: boolean }) {
  if (isLate)
    return (
      <Badge variant="destructive" className="gap-1">
        <TrendingDown className="h-3 w-3" />
        {pct}%
      </Badge>
    )
  if (pct >= 100)
    return (
      <Badge className="bg-green-600 gap-1">
        <TrendingUp className="h-3 w-3" />
        {pct}%
      </Badge>
    )
  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="h-3 w-3" />
      {pct}%
    </Badge>
  )
}

export default function ReportPage() {
  const [stageFilter, setStageFilter] = useState('')

  const params = useMemo(
    () => ({ stage: stageFilter || undefined }),
    [stageFilter],
  )
  const { data: rows = [], isLoading } = useProgressReport(params)

  const lateCount = rows.filter((r) => r.isLate).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo tiến độ sản xuất</h1>
          <p className="text-sm text-muted-foreground mt-1">
            So sánh kế hoạch vs thực tế theo chuyền / mã hàng / công đoạn
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            In / PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tất cả công đoạn" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s ? STAGE_LABELS[s] : 'Tất cả công đoạn'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {lateCount > 0 && (
          <Badge variant="destructive" className="gap-1 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lateCount} mục chậm tiến độ
          </Badge>
        )}

        {!isLoading && (
          <span className="text-sm text-muted-foreground ml-auto">
            {rows.length} dòng
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Xưởng', 'Chuyền', 'Mã hàng', 'Công đoạn', 'KH', 'TT', '% HT', 'Deadline', 'Dự báo', 'Trạng thái'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        row.isLate && 'bg-red-50 hover:bg-red-50',
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{row.factoryName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.lineName}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.styleCode}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">{row.styleName}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[row.stage] ?? row.stage}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {row.plannedQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                        {row.actualQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(row.pct, 100)}
                            className={cn('h-1.5 flex-1', row.isLate ? '[&>div]:bg-red-500' : '')}
                          />
                          <PctBadge pct={row.pct} isLate={row.isLate} />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {row.expectedFinishDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.estimatedFinishDate ? (
                          <span
                            className={cn(
                              'text-sm',
                              row.estimatedFinishDate > row.expectedFinishDate ? 'text-red-600 font-medium' : 'text-green-600',
                            )}
                          >
                            {row.estimatedFinishDate}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.isLate ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Chậm
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                            Đúng hạn
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 4px 8px; }
        }
      `}</style>
    </div>
  )
}
