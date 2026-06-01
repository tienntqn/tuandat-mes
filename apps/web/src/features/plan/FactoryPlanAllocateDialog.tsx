import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { lineApi } from '@/features/production-line/line.api'
import { useBulkCreateFactoryPlan, useDeleteFactoryPlan, useCompanyPlanProgress } from './plan.hooks'
import type { CompanyPlan } from './plan.api'

interface LineRow {
  lineId: string
  plannedQuantity: string
  expectedFinishDate: string
}

interface Props {
  open: boolean
  onClose: () => void
  companyPlan: CompanyPlan
}

// Thanh tổng phân bổ
function AllocationSummary({ total, allocated, adding }: { total: number; allocated: number; adding: number }) {
  const newTotal = allocated + adding
  const remaining = total - newTotal
  const isOver = newTotal > total
  const pct = total > 0 ? Math.min(100, Math.round((newTotal / total) * 100)) : 0
  return (
    <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Chỉ tiêu xưởng</span>
        <span className="font-semibold">{total.toLocaleString()} SP</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Đã phân chuyền</span>
        <span className="font-medium">{allocated.toLocaleString()} SP</span>
      </div>
      {adding > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Đang thêm</span>
          <span className="font-medium text-blue-600">+{adding.toLocaleString()} SP</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : pct >= 90 ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-sm font-medium">
        <span className={isOver ? 'text-destructive' : 'text-muted-foreground'}>
          {isOver ? '⚠️ Vượt chỉ tiêu!' : `Còn lại:`}
        </span>
        <span className={isOver ? 'text-destructive' : remaining === 0 ? 'text-green-600' : 'text-foreground'}>
          {remaining.toLocaleString()} SP
        </span>
      </div>
    </div>
  )
}

export function FactoryPlanAllocateDialog({ open, onClose, companyPlan }: Props) {
  const [rows, setRows] = useState<LineRow[]>([
    { lineId: '', plannedQuantity: '', expectedFinishDate: '' },
  ])
  const [errors, setErrors] = useState<string[]>([])

  // Lấy tiến độ hiện tại của CompanyPlan (đã phân cho chuyền nào)
  const { data: progress, refetch: refetchProgress } = useCompanyPlanProgress(companyPlan.id)
  // Danh sách chuyền thuộc xưởng này
  const { data: linesData } = useQuery({
    queryKey: ['lines-by-factory', companyPlan.factoryId],
    queryFn: () => lineApi.list({ factoryId: companyPlan.factoryId, pageSize: 50 }),
    enabled: open,
  })

  const bulkCreate = useBulkCreateFactoryPlan()
  const deleteFactoryPlan = useDeleteFactoryPlan()

  useEffect(() => {
    if (open) {
      setRows([{ lineId: '', plannedQuantity: '', expectedFinishDate: '' }])
      setErrors([])
      refetchProgress()
    }
  }, [open, companyPlan.id])

  if (!open) return null

  const existingPlans = progress?.factoryPlans ?? []
  const allocatedSoFar = existingPlans.reduce((s, fp) => s + fp.plannedQuantity, 0)
  const addingNow = rows.reduce((s, r) => s + (Number(r.plannedQuantity) || 0), 0)
  const totalAllocated = companyPlan.plannedQuantity

  const lineList = linesData?.data ?? []
  // Chuyền đã phân (để highlight)
  const allocatedLineIds = new Set(existingPlans.map((fp) => fp.lineId))

  const addRow = () => {
    setRows((prev) => [...prev, { lineId: '', plannedQuantity: '', expectedFinishDate: '' }])
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateRow = (idx: number, field: keyof LineRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const validate = () => {
    const errs: string[] = []
    rows.forEach((r, i) => {
      const msgs = []
      if (!r.lineId) msgs.push('chọn chuyền')
      if (!r.plannedQuantity || Number(r.plannedQuantity) <= 0) msgs.push('số lượng > 0')
      if (!r.expectedFinishDate) msgs.push('chọn deadline')
      if (msgs.length > 0) errs.push(`Dòng ${i + 1}: ${msgs.join(', ')}`)
    })
    // Trùng chuyền trong form
    const lineIds = rows.filter((r) => r.lineId).map((r) => r.lineId)
    const dupes = lineIds.filter((id, i) => lineIds.indexOf(id) !== i)
    if (dupes.length > 0) errs.push('Không được chọn cùng chuyền 2 lần')
    // Tổng vượt chỉ tiêu
    if (allocatedSoFar + addingNow > totalAllocated) {
      errs.push(`Tổng phân bổ (${(allocatedSoFar + addingNow).toLocaleString()}) vượt chỉ tiêu (${totalAllocated.toLocaleString()})`)
    }
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }

    bulkCreate.mutate(
      {
        plans: rows.map((r) => ({
          companyPlanId: companyPlan.id,
          lineId: Number(r.lineId),
          plannedQuantity: Number(r.plannedQuantity),
          expectedFinishDate: r.expectedFinishDate,
        })),
      },
      {
        onSuccess: () => {
          refetchProgress()
          setRows([{ lineId: '', plannedQuantity: '', expectedFinishDate: '' }])
          setErrors([])
        },
      },
    )
  }

  const handleDeleteExisting = (fpId: number) => {
    deleteFactoryPlan.mutate(fpId, { onSuccess: () => refetchProgress() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-card shadow-xl border max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Phân bổ kế hoạch cho chuyền</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {companyPlan.style?.code} — {companyPlan.style?.name} · {companyPlan.factory?.name}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Tổng quan phân bổ */}
          <AllocationSummary
            total={totalAllocated}
            allocated={allocatedSoFar}
            adding={addingNow}
          />

          {/* Danh sách chuyền đã phân */}
          {existingPlans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Đã phân bổ</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Chuyền</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Số lượng</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">Deadline</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {existingPlans.map((fp) => (
                      <tr key={fp.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          Chuyền {fp.line?.lineNumber} — {fp.line?.name}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{fp.plannedQuantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">
                          {new Date(fp.expectedFinishDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleDeleteExisting(fp.id)}
                            disabled={deleteFactoryPlan.isPending}
                            className="rounded p-1 text-destructive hover:bg-destructive/10"
                            title="Gỡ phân bổ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form thêm mới */}
          <form id="allocate-form" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Thêm phân bổ mới</h3>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm chuyền
              </button>
            </div>

            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_120px_140px_32px] gap-2 items-start">
                  <div>
                    <select
                      value={row.lineId}
                      onChange={(e) => updateRow(idx, 'lineId', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Chọn chuyền —</option>
                      {lineList.map((l: any) => (
                        <option key={l.id} value={l.id} disabled={allocatedLineIds.has(l.id)}>
                          Chuyền {l.lineNumber} — {l.name}
                          {allocatedLineIds.has(l.id) ? ' (đã phân)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      value={row.plannedQuantity}
                      onChange={(e) => updateRow(idx, 'plannedQuantity', e.target.value)}
                      placeholder="Số lượng"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={row.expectedFinishDate}
                      onChange={(e) => updateRow(idx, 'expectedFinishDate', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="mt-1 rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                {errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
            Đóng
          </button>
          <button
            type="submit"
            form="allocate-form"
            disabled={bulkCreate.isPending || rows.every((r) => !r.lineId)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {bulkCreate.isPending ? 'Đang lưu...' : 'Phân bổ cho chuyền'}
          </button>
        </div>
      </div>
    </div>
  )
}
