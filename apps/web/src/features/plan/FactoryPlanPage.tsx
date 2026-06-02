import { useState } from 'react'
import { GitBranch, ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useFactoryPlans, useUpdateFactoryPlan } from './plan.hooks'
import { FactoryPlanEditDialog } from './FactoryPlanEditDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import type { FactoryPlan, UpdateFactoryPlanDto } from './plan.api'

// Hiển thị thanh tiến trình phân bổ xưởng
function AllocBar({ allocated, total }: { allocated: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0
  const isOver = allocated > total
  return (
    <div style={{ minWidth: 120 }}>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">{pct}%</span>
        <span className={isOver ? 'text-danger fw-medium' : ''}>
          {allocated.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div
          className={`progress-bar ${isOver ? 'bg-danger' : pct >= 90 ? 'bg-warning' : 'bg-primary'}`}
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
    <PageWrapper
      title="Kế hoạch Xưởng"
      breadcrumbs={[{ label: 'Kế hoạch' }, { label: 'Xưởng' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      <p className="text-muted mb-3">
        Phân bổ chỉ tiêu xuống từng chuyền · {grouped.length} nhóm kế hoạch
      </p>

      {/* Filters */}
      {showFactoryFilter && (
        <div className="row mb-3">
          <div className="col-auto">
            <select
              value={filterFactoryId}
              onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
              className="form-select"
            >
              <option value="">Tất cả xưởng</option>
              {factories?.data?.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grouped table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Mã hàng / PO / Xưởng</th>
                  <th className="text-end">Chỉ tiêu xưởng</th>
                  <th>Phân bổ chuyền</th>
                  <th className="text-center">Deadline</th>
                  {canWrite && <th className="text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">Đang tải...</td>
                  </tr>
                ) : grouped.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
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
                          style={{ cursor: 'pointer', backgroundColor: 'var(--bs-light, #f8f9fa)' }}
                          onClick={() => toggleGroup(group.companyPlanId)}
                        >
                          <td className="text-center text-muted">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 mx-auto" />
                              : <ChevronRight className="h-4 w-4 mx-auto" />}
                          </td>
                          <td>
                            <div className="fw-medium">{group.style?.code} — {group.style?.name}</div>
                            <small className="text-muted fw-normal">
                              PO: {group.po?.poNumber} · Xưởng: {group.factory?.name}
                            </small>
                          </td>
                          <td className="text-end font-monospace fw-medium">
                            {group.plannedQty.toLocaleString()}
                          </td>
                          <td>
                            <AllocBar allocated={group.totalAllocated} total={group.plannedQty} />
                          </td>
                          <td className="text-center text-muted">—</td>
                          {canWrite && <td />}
                        </tr>

                        {/* Child rows: từng chuyền */}
                        {isExpanded && group.plans.map((fp) => (
                          <tr key={fp.id}>
                            <td />
                            <td className="ps-4 py-2">
                              <span className="d-inline-flex align-items-center gap-1 text-muted">
                                <GitBranch size={14} className="text-primary" />
                                Chuyền {fp.line?.lineNumber} — {fp.line?.name}
                              </span>
                            </td>
                            <td className="text-end font-monospace py-2">
                              {fp.plannedQuantity.toLocaleString()}
                            </td>
                            <td className="text-muted small py-2">
                              {Math.round((fp.plannedQuantity / group.plannedQty) * 100)}% chỉ tiêu xưởng
                            </td>
                            <td className="text-center text-muted py-2">
                              {new Date(fp.expectedFinishDate).toLocaleDateString('vi-VN')}
                            </td>
                            {canWrite && (
                              <td className="text-center py-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditTarget(fp) }}
                                  className="btn btn-sm btn-outline-secondary"
                                  title="Sửa số lượng / deadline"
                                >
                                  <i className="fe fe-edit-2"></i>
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
    </PageWrapper>
  )
}
