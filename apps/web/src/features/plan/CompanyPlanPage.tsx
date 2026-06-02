import { useState } from 'react'
import { GitBranch, ChevronDown, ChevronRight } from 'lucide-react'
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
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import { poApi } from '@/features/purchase-order/po.api'
import type { CompanyPlan, CreateCompanyPlanDto, UpdateCompanyPlanDto } from './plan.api'

// Thanh tiến trình hiển thị đã phân bổ / còn lại
function AllocationBar({ allocated, total, label }: { allocated: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0
  const isOver = allocated > total
  return (
    <div style={{ minWidth: 140 }}>
      <div className="d-flex justify-content-between small text-muted mb-1">
        <span>{label}</span>
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
      <div className="small text-muted mt-1">
        Còn lại: <span className={total - allocated < 0 ? 'text-danger fw-medium' : 'fw-medium'}>
          {(total - allocated).toLocaleString()}
        </span>
      </div>
    </div>
  )
}

// Hàng mở rộng: hiển thị các FactoryPlan con
function ExpandedFactoryPlans({ plan }: { plan: CompanyPlan }) {
  const fps = plan.factoryPlans ?? []
  if (fps.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-2 small text-muted fst-italic" style={{ backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
          Chưa phân bổ cho chuyền nào
        </td>
      </tr>
    )
  }
  return (
    <>
      {fps.map((fp) => (
        <tr key={fp.id} style={{ backgroundColor: 'var(--bs-light, #f8f9fa)' }}>
          <td />
          <td colSpan={2} className="py-2 ps-4 small">
            <span className="d-inline-flex align-items-center gap-1 text-muted">
              <GitBranch size={12} />
              Chuyền {fp.line?.lineNumber} — {fp.line?.name}
            </span>
          </td>
          <td className="py-2 text-end font-monospace small">{fp.plannedQuantity.toLocaleString()}</td>
          <td colSpan={4} className="py-2 small text-muted text-center">
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
    <PageWrapper
      title="Kế hoạch Công ty"
      breadcrumbs={[{ label: 'Kế hoạch' }, { label: 'Công ty' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Thêm kế hoạch
            </button>
          )}
        </div>
      }
    >
      <p className="text-muted mb-3">
        Phân bổ chỉ tiêu sản xuất từ PO xuống các xưởng · {data?.total ?? 0} kế hoạch
      </p>

      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-auto">
          <select
            value={filterFactoryId}
            onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
            className="form-select"
          >
            <option value="">Tất cả xưởng</option>
            {factoryList.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <select
            value={filterPoId}
            onChange={(e) => { setFilterPoId(e.target.value); setPage(1) }}
            className="form-select"
          >
            <option value="">Tất cả PO</option>
            {poList.map((p: any) => (
              <option key={p.id} value={p.id}>{p.poNumber}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Mã hàng / PO</th>
                  <th>Xưởng</th>
                  <th className="text-end">Chỉ tiêu</th>
                  <th>Phân bổ cho chuyền</th>
                  <th className="text-center">Ngày bắt đầu</th>
                  <th className="text-center">Deadline</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
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
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleExpand(plan.id)}
                        >
                          <td className="text-center text-muted">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 mx-auto" />
                              : <ChevronRight className="h-4 w-4 mx-auto" />}
                          </td>
                          <td>
                            <div className="fw-medium">{plan.style?.code} — {plan.style?.name}</div>
                            <small className="text-muted">
                              PO: {plan.po?.poNumber} · Tổng: {plan.po?.totalQuantity?.toLocaleString()} SP
                            </small>
                          </td>
                          <td>
                            <span className="fw-medium">{plan.factory?.name}</span>
                            <div className="small text-muted">{plan.factory?.code}</div>
                          </td>
                          <td className="text-end font-monospace fw-semibold">
                            {plan.plannedQuantity.toLocaleString()}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <AllocationBar
                              allocated={plan.allocatedToLines ?? 0}
                              total={plan.plannedQuantity}
                              label={`${fpCount} chuyền`}
                            />
                          </td>
                          <td className="text-center text-muted">
                            {new Date(plan.startDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="text-center text-muted">
                            {new Date(plan.expectedFinishDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex justify-content-center gap-1">
                              {canAllocate && (
                                <button
                                  onClick={() => setAllocateTarget(plan)}
                                  title="Phân bổ cho chuyền"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <GitBranch size={14} />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  onClick={() => { setEditTarget(plan); setFormOpen(true) }}
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  <i className="fe fe-edit-2"></i>
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  onClick={() => setDeleteTarget(plan)}
                                  className="btn btn-sm btn-outline-danger"
                                >
                                  <i className="fe fe-trash-2"></i>
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
        onClose={() => setDeleteTarget(null)}
        isPending={deletePlan.isPending}
      />
    </PageWrapper>
  )
}
