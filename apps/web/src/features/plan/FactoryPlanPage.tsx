import { useState } from 'react'
import { RefreshCw, GitBranch, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useFactoryPlans, useUpdateFactoryPlan } from './plan.hooks'
import { FactoryPlanEditDialog } from './FactoryPlanEditDialog'
import { Pagination } from '@/components/shared/Pagination'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import type { FactoryPlan, UpdateFactoryPlanDto } from './plan.api'

// Hiển thị thanh tiến trình phân bổ xưởng
function AllocBar({ allocated, total }: { allocated: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0
  const isOver = allocated > total
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{pct}%</span>
        <span className={isOver ? 'text-destructive font-medium' : 'text-foreground'}>
          {allocated.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? 'bg-destructive' : pct >= 90 ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Nhóm factory plans theo CompanyPlan để hiển thị dạng cây
interface GroupedPlan {
  companyPlanId: number
  style: { code: string; name: string } | undefined
  po: { poNumber: string } | undefined
  factory: { name: string } | undefined
  plannedQty: number
  plans: FactoryPlan[]
  totalAllocated: number
}

function groupByCompanyPlan(fps: FactoryPlan[]): GroupedPlan[] {
  const map = new Map<number, GroupedPlan>()
  for (const fp of fps) {
    const cpId = fp.companyPlanId
    if (!map.has(cpId)) {
      map.set(cpId, {
        companyPlanId: cpId,
        style: fp.companyPlan?.style,
        po: fp.companyPlan?.po,
        factory: fp.companyPlan?.factory,
        plannedQty: fp.companyPlan?.plannedQuantity ?? 0,
        plans: [],
        totalAllocated: 0,
      })
    }
    const g = map.get(cpId)!
    g.plans.push(fp)
    g.totalAllocated += fp.plannedQuantity
  }
  return Array.from(map.values())
}

export default function FactoryPlanPage() {
  const [page, setPage] = useState(1)
  const [filterFactoryId, setFilterFactoryId] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [editTarget, setEditTarget] = useState<FactoryPlan | null>(null)

  const { isAdmin, hasRole, user } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER') || hasRole('FACTORY_DIRECTOR') || hasRole('FACTORY_PLANNER')

  // FACTORY scope: tự động lọc theo xưởng mình
  const scopedFactoryId = user?.factoryId

  const params = {
    factoryId: filterFactoryId ? Number(filterFactoryId) : (scopedFactoryId || undefined),
    page,
    pageSize: 100, // lấy nhiều để nhóm client-side
  }

  const { data, isLoading, refetch } = useFactoryPlans(params)
  const { data: factories } = useQuery({
    queryKey: ['factories-all'],
    queryFn: () => factoryApi.list({ pageSize: 100 }),
    enabled: isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER'),
  })

  const updatePlan = useUpdateFactoryPlan()

  const handleUpdate = (id: number, dto: UpdateFactoryPlanDto) => {
    updatePlan.mutate({ id, dto }, { onSuccess: () => setEditTarget(null) })
  }

  const toggleGroup = (cpId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(cpId) ? next.delete(cpId) : next.add(cpId)
      return next
    })
  }

  const fps = data?.data ?? []
  const grouped = groupByCompanyPlan(fps)
  const showFactoryFilter = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kế hoạch Xưởng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Phân bổ chỉ tiêu xuống từng chuyền · {grouped.length} nhóm kế hoạch
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      {showFactoryFilter && (
        <div className="flex gap-3">
          <select
            value={filterFactoryId}
            onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả xưởng</option>
            {factories?.data?.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Grouped table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="w-8" />
                <th className="px-4 py-3 text-left font-medium">Mã hàng / PO / Xưởng</th>
                <th className="px-4 py-3 text-right font-medium">Chỉ tiêu xưởng</th>
                <th className="px-4 py-3 text-left font-medium">Phân bổ chuyền</th>
                <th className="px-4 py-3 text-center font-medium">Deadline</th>
                {canWrite && <th className="px-4 py-3 text-center font-medium">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Chưa có kế hoạch xưởng nào. Cần phân bổ từ Kế hoạch Công ty trước.
                  </td>
                </tr>
              ) : (
                grouped.map((group) => {
                  const isExpanded = expandedGroups.has(group.companyPlanId)
                  return (
                    <>
                      {/* Group header row */}
                      <tr
                        key={`g-${group.companyPlanId}`}
                        className="bg-muted/10 hover:bg-muted/20 cursor-pointer font-medium"
                        onClick={() => toggleGroup(group.companyPlanId)}
                      >
                        <td className="px-2 py-3 text-center text-muted-foreground">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 mx-auto" />
                            : <ChevronRight className="h-4 w-4 mx-auto" />}
                        </td>
                        <td className="px-4 py-3">
                          <div>{group.style?.code} — {group.style?.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-normal">
                            PO: {group.po?.poNumber} · Xưởng: {group.factory?.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {group.plannedQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <AllocBar allocated={group.totalAllocated} total={group.plannedQty} />
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                        {canWrite && <td className="px-4 py-3" />}
                      </tr>

                      {/* Child rows: từng chuyền */}
                      {isExpanded && group.plans.map((fp) => (
                        <tr key={fp.id} className="hover:bg-muted/10 border-b last:border-0">
                          <td />
                          <td className="px-6 py-2.5">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                              Chuyền {fp.line?.lineNumber} — {fp.line?.name}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {fp.plannedQuantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-sm">
                            {Math.round((fp.plannedQuantity / group.plannedQty) * 100)}% chỉ tiêu xưởng
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {new Date(fp.expectedFinishDate).toLocaleDateString('vi-VN')}
                          </td>
                          {canWrite && (
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditTarget(fp) }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                                title="Sửa số lượng / deadline"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <FactoryPlanEditDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          factoryPlan={editTarget}
          onSubmit={(dto) => handleUpdate(editTarget.id, dto)}
          loading={updatePlan.isPending}
        />
      )}
    </div>
  )
}
