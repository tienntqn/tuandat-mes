import { useState } from 'react'
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  useCompanyPlans,
  useCreateCompanyPlan,
  useUpdateCompanyPlan,
  useDeleteCompanyPlan,
} from './plan.hooks'
import { CompanyPlanFormDialog } from './CompanyPlanFormDialog'
import { FactoryPlanAllocateDialog } from './FactoryPlanAllocateDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import { styleApi } from '@/features/style/style.api'
import { poApi } from '@/features/purchase-order/po.api'
import type { CompanyPlan, CreateCompanyPlanDto, UpdateCompanyPlanDto } from './plan.api'

// Thanh tiến trình hiển thị đã phân bổ / còn lại
function AllocationBar({ allocated, total, label }: { allocated: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0
  const isOver = allocated > total
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={isOver ? 'text-destructive font-medium' : ''}>
          {allocated.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : pct >= 90 ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Còn lại: <span className={total - allocated < 0 ? 'text-destructive font-medium' : 'text-foreground font-medium'}>
          {(total - allocated).toLocaleString()}
        </span>
      </p>
    </div>
  )
}

// Hàng mở rộng: hiển thị các FactoryPlan con
function ExpandedFactoryPlans({ plan }: { plan: CompanyPlan }) {
  const fps = plan.factoryPlans ?? []
  if (fps.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-6 py-3 text-sm text-muted-foreground italic bg-muted/30">
          Chưa phân bổ cho chuyền nào
        </td>
      </tr>
    )
  }
  return (
    <>
      {fps.map((fp) => (
        <tr key={fp.id} className="bg-muted/20 border-b">
          <td />
          <td className="px-6 py-2 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              Chuyền {fp.line?.lineNumber} — {fp.line?.name}
            </span>
          </td>
          <td className="px-3 py-2 text-sm text-right font-mono">{fp.plannedQuantity.toLocaleString()}</td>
          <td className="px-3 py-2 text-sm text-center text-muted-foreground" colSpan={5}>
            Deadline: {new Date(fp.expectedFinishDate).toLocaleDateString('vi-VN')}
          </td>
        </tr>
      ))}
    </>
  )
}

export default function CompanyPlanPage() {
  const [page, setPage] = useState(1)
  const [filterFactoryId, setFilterFactoryId] = useState<string>('')
  const [filterPoId, setFilterPoId] = useState<string>('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CompanyPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CompanyPlan | null>(null)
  const [allocateTarget, setAllocateTarget] = useState<CompanyPlan | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')
  const canAllocate = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER') || hasRole('FACTORY_DIRECTOR') || hasRole('FACTORY_PLANNER')

  const params = {
    factoryId: filterFactoryId ? Number(filterFactoryId) : undefined,
    poId: filterPoId ? Number(filterPoId) : undefined,
    page,
    pageSize: 20,
  }

  const { data, isLoading, refetch } = useCompanyPlans(params)
  const { data: factories } = useQuery({ queryKey: ['factories-all'], queryFn: () => factoryApi.list({ pageSize: 100 }) })
  const { data: posData } = useQuery({ queryKey: ['pos-all'], queryFn: () => poApi.list({ pageSize: 200 }) })

  const createPlan = useCreateCompanyPlan()
  const updatePlan = useUpdateCompanyPlan()
  const deletePlan = useDeleteCompanyPlan()

  const handleSubmit = (dto: CreateCompanyPlanDto) => {
    if (editTarget) {
      updatePlan.mutate(
        { id: editTarget.id, dto: dto as UpdateCompanyPlanDto },
        { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
      )
    } else {
      createPlan.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const factoryList = factories?.data ?? []
  const poList = posData?.data ?? []
  const plans = data?.data ?? []

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kế hoạch Công ty</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Phân bổ chỉ tiêu sản xuất từ PO xuống các xưởng · {data?.total ?? 0} kế hoạch
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Thêm kế hoạch
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterFactoryId}
          onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tất cả xưởng</option>
          {factoryList.map((f: any) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={filterPoId}
          onChange={(e) => { setFilterPoId(e.target.value); setPage(1) }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tất cả PO</option>
          {poList.map((p: any) => (
            <option key={p.id} value={p.id}>{p.poNumber}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="w-8" />
                <th className="px-4 py-3 text-left font-medium">Mã hàng / PO</th>
                <th className="px-4 py-3 text-left font-medium">Xưởng</th>
                <th className="px-4 py-3 text-right font-medium">Chỉ tiêu</th>
                <th className="px-4 py-3 text-left font-medium">Phân bổ cho chuyền</th>
                <th className="px-4 py-3 text-center font-medium">Ngày bắt đầu</th>
                <th className="px-4 py-3 text-center font-medium">Deadline</th>
                <th className="px-4 py-3 text-center font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Đang tải...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Chưa có kế hoạch nào. Nhấn "Thêm kế hoạch" để bắt đầu.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const isExpanded = expandedIds.has(plan.id)
                  const fpCount = plan.factoryPlans?.length ?? 0
                  return (
                    <>
                      <tr
                        key={plan.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(plan.id)}
                      >
                        <td className="px-2 py-3 text-center text-muted-foreground">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 mx-auto" />
                            : <ChevronRight className="h-4 w-4 mx-auto" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{plan.style?.code} — {plan.style?.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            PO: {plan.po?.poNumber} · Tổng: {plan.po?.totalQuantity?.toLocaleString()} SP
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{plan.factory?.name}</span>
                          <div className="text-xs text-muted-foreground">{plan.factory?.code}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {plan.plannedQuantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <AllocationBar
                            allocated={plan.allocatedToLines ?? 0}
                            total={plan.plannedQuantity}
                            label={`${fpCount} chuyền`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(plan.startDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(plan.expectedFinishDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1">
                            {canAllocate && (
                              <button
                                onClick={() => setAllocateTarget(plan)}
                                title="Phân bổ cho chuyền"
                                className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                <GitBranch className="h-4 w-4" />
                              </button>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => { setEditTarget(plan); setFormOpen(true) }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                              >
                                ✏️
                              </button>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => setDeleteTarget(plan)}
                                className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedFactoryPlans key={`exp-${plan.id}`} plan={plan} />}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      {/* Dialogs */}
      <CompanyPlanFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        initial={editTarget}
        loading={createPlan.isPending || updatePlan.isPending}
      />

      {allocateTarget && (
        <FactoryPlanAllocateDialog
          open={!!allocateTarget}
          onClose={() => setAllocateTarget(null)}
          companyPlan={allocateTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa kế hoạch"
        description={`Xóa kế hoạch "${deleteTarget?.style?.code} → ${deleteTarget?.factory?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (deleteTarget) deletePlan.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
        onCancel={() => setDeleteTarget(null)}
        loading={deletePlan.isPending}
      />
    </div>
  )
}
