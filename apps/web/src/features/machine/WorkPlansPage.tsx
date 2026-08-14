import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Send, Check, Printer, Play, ChevronDown, ChevronRight, Settings, Package } from 'lucide-react'
import {
  useWorkPlans,
  useCreateWorkPlan,
  useUpdateWorkPlan,
  useSubmitWorkPlan,
  useApproveWorkPlan,
  useRejectWorkPlan,
  useStartWorkPlan,
  useCompleteWorkPlan,
  useCancelWorkPlan,
  useDeleteWorkPlan,
} from './maintenance-plan.hooks'
import { useCreateWorkOrder } from './mmtb-ops.hooks'
import {
  PLAN_STATUS_LABELS,
  PLAN_STATUS_BADGE,
  type WorkPlan,
  type WorkPlanStatus,
  type WorkPlanItem,
} from './maintenance-plan.api'
import { WORK_TYPE_LABELS, type WorkType } from './work-order.api'
import { WorkPlanFormDialog } from './WorkPlanFormDialog'
import { WorkPlanPrint } from './WorkPlanPrint'
import { WorkOrderFormDialog } from './WorkOrderFormDialog'
import { MaterialNeedsDialog } from './MaterialNeedsDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Trang kế hoạch sửa chữa / bảo dưỡng — duyệt 2 cấp: giám đốc xưởng rồi công ty. */
export default function WorkPlansPage({ defaultType }: { defaultType?: WorkType } = {}) {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'' | WorkType>(defaultType ?? '')
  const [statusFilter, setStatusFilter] = useState<'' | WorkPlanStatus>('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkPlan | null>(null)
  const [printTarget, setPrintTarget] = useState<WorkPlan | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WorkPlan | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState<WorkPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkPlan | null>(null)
  const [orderFor, setOrderFor] = useState<{ plan: WorkPlan; item: WorkPlanItem } | null>(null)
  const [needsFor, setNeedsFor] = useState<WorkPlan | null>(null)
  const navigate = useNavigate()

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  const canApprove = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data, isLoading, refetch } = useWorkPlans({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const createPlan = useCreateWorkPlan()
  const updatePlan = useUpdateWorkPlan()
  const submitPlan = useSubmitWorkPlan()
  const approvePlan = useApproveWorkPlan()
  const rejectPlan = useRejectWorkPlan()
  const startPlan = useStartWorkPlan()
  const completePlan = useCompleteWorkPlan()
  const cancelPlan = useCancelWorkPlan()
  const deletePlan = useDeleteWorkPlan()
  const createWorkOrder = useCreateWorkOrder()

  const toggleExpand = (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const title = defaultType ? `Kế hoạch ${WORK_TYPE_LABELS[defaultType].toLowerCase()}` : 'Kế hoạch sửa chữa / bảo dưỡng'

  return (
    <PageWrapper
      title={title}
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: title }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập kế hoạch
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Luồng duyệt <strong>2 cấp</strong>: Cơ điện lập → trình <strong>Giám đốc xưởng</strong> duyệt →
        nếu chi phí vượt ngưỡng cấu hình thì trình <strong>Công ty</strong> duyệt → triển khai.
        Ngưỡng chi phí đặt trong trang Cấu hình hệ thống.
      </div>

      <div className="row g-2 mb-3">
        {!defaultType && (
          <div className="col-auto">
            <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as WorkType | ''); setPage(1) }}>
              <option value="">Tất cả loại</option>
              {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
                <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}
        <div className="col-auto">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as WorkPlanStatus | ''); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(PLAN_STATUS_LABELS) as WorkPlanStatus[]).map((s) => (
              <option key={s} value={s}>{PLAN_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số kế hoạch, tên..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} kế hoạch</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Số kế hoạch</th><th>Tên kế hoạch</th>
              <th className="text-center">Thời gian</th><th className="text-center">Số việc</th>
              <th className="text-end">Chi phí DK</th><th className="text-center">Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có kế hoạch nào</td></tr>
            ) : (
              data?.data.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td>
                      <button onClick={() => toggleExpand(p.id)} className="btn btn-sm btn-link p-0">
                        {expanded.has(p.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td>
                      <code>{p.planNo}</code>
                      <div className="small text-muted">{WORK_TYPE_LABELS[p.type]}</div>
                    </td>
                    <td>
                      <div className="fw-medium">{p.title}</div>
                      <div className="small text-muted">{p.factory?.name}</div>
                      {p.rejectReason && <div className="small text-danger">Từ chối: {p.rejectReason}</div>}
                    </td>
                    <td className="text-center small">{fmtDate(p.periodFrom)}<br />{fmtDate(p.periodTo)}</td>
                    <td className="text-center">{p.items?.length ?? 0}</td>
                    <td className="text-end small">{p.totalEstimatedCost != null ? Number(p.totalEstimatedCost).toLocaleString('vi-VN') : '—'}</td>
                    <td className="text-center">
                      <span className={`badge ${PLAN_STATUS_BADGE[p.status]}`}>{PLAN_STATUS_LABELS[p.status]}</span>
                      {p.factoryApprovedAt && <div className="small text-muted">Xưởng: {fmtDate(p.factoryApprovedAt)}</div>}
                      {p.companyApprovedAt && <div className="small text-muted">Công ty: {fmtDate(p.companyApprovedAt)}</div>}
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1 flex-wrap">
                        <button onClick={() => setPrintTarget(p)} className="btn btn-sm btn-outline-secondary" title="In kế hoạch"><Printer size={13} /></button>
                        <button onClick={() => setNeedsFor(p)} className="btn btn-sm btn-outline-secondary" title="Nhu cầu vật tư"><Package size={13} /></button>
                        {canWrite && (p.status === 'DRAFT' || p.status === 'REJECTED') && (
                          <>
                            <button onClick={() => { setEditTarget(p); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                            <button onClick={() => submitPlan.mutate(p.id)} disabled={submitPlan.isPending} className="btn btn-sm btn-primary text-white">
                              <Send size={13} /> Trình duyệt
                            </button>
                          </>
                        )}
                        {canApprove && (p.status === 'PENDING_FACTORY' || p.status === 'PENDING_COMPANY') && (
                          <>
                            <button onClick={() => approvePlan.mutate(p.id)} disabled={approvePlan.isPending} className="btn btn-sm btn-primary text-white">
                              <Check size={13} /> Duyệt
                            </button>
                            <button onClick={() => { setRejectTarget(p); setRejectReason('') }} className="btn btn-sm btn-outline-danger">Từ chối</button>
                          </>
                        )}
                        {canWrite && p.status === 'APPROVED' && (
                          <button onClick={() => startPlan.mutate(p.id)} disabled={startPlan.isPending} className="btn btn-sm btn-outline-primary">
                            <Play size={13} /> Triển khai
                          </button>
                        )}
                        {canWrite && p.status === 'IN_PROGRESS' && (
                          <button onClick={() => completePlan.mutate(p.id)} disabled={completePlan.isPending} className="btn btn-sm btn-outline-success">Kết thúc</button>
                        )}
                        {canWrite && p.status === 'DRAFT' && (
                          <button onClick={() => setDeleteTarget(p)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                        )}
                        {canApprove && p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.status !== 'DRAFT' && (
                          <button onClick={() => setCancelTarget(p)} className="btn btn-sm btn-outline-danger">Hủy</button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Chi tiết các dòng công việc trong kế hoạch */}
                  {expanded.has(p.id) && (
                    <tr>
                      <td colSpan={8} className="bg-light">
                        <div className="p-2">
                          <table className="table table-sm mb-0 bg-white">
                            <thead>
                              <tr>
                                <th style={{ width: 36 }}>#</th><th>Máy</th><th>Nội dung</th>
                                <th className="text-center" style={{ width: 110 }}>Ngày dự kiến</th>
                                <th className="text-end" style={{ width: 110 }}>Chi phí DK</th>
                                <th style={{ width: 200 }}>Phiếu thực hiện</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.items ?? []).length === 0 ? (
                                <tr><td colSpan={6} className="text-center text-muted small">Chưa có công việc</td></tr>
                              ) : p.items!.map((it, idx) => (
                                <tr key={it.id}>
                                  <td>{idx + 1}</td>
                                  <td className="small">
                                    <span className="fw-medium">{it.machine?.code}</span> — {it.machine?.name}
                                    {it.machine?.line && <div className="text-muted">{it.machine.line.name}</div>}
                                  </td>
                                  <td className="small">{it.content}</td>
                                  <td className="text-center small">{fmtDate(it.plannedDate)}</td>
                                  <td className="text-end small">{it.estimatedCost != null ? Number(it.estimatedCost).toLocaleString('vi-VN') : '—'}</td>
                                  <td className="small">
                                    {it.workOrder ? (
                                      <code>{it.workOrder.orderNo}</code>
                                    ) : canWrite && (p.status === 'APPROVED' || p.status === 'IN_PROGRESS') ? (
                                      <button onClick={() => setOrderFor({ plan: p, item: it })} className="btn btn-sm btn-outline-primary">
                                        <Settings size={12} /> Lập phiếu
                                      </button>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <WorkPlanFormDialog
        open={formOpen}
        plan={editTarget}
        defaultType={defaultType ?? 'MAINTENANCE'}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={(dto) => {
          if (editTarget) {
            const { title: t, periodFrom, periodTo, note, items } = dto
            updatePlan.mutate(
              { id: editTarget.id, dto: { title: t, periodFrom, periodTo, note, items } },
              { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
            )
          } else {
            createPlan.mutate(dto, { onSuccess: () => setFormOpen(false) })
          }
        }}
        isPending={createPlan.isPending || updatePlan.isPending}
      />

      {/* Lập phiếu thực hiện cho một dòng kế hoạch */}
      <WorkOrderFormDialog
        open={!!orderFor}
        defaultType={orderFor?.plan.type ?? 'MAINTENANCE'}
        defaultMachineId={orderFor?.item.machineId}
        planItemId={orderFor?.item.id}
        defaultContent={orderFor?.item.content}
        onClose={() => setOrderFor(null)}
        onSubmit={(dto) => createWorkOrder.mutate(dto, { onSuccess: () => { setOrderFor(null); refetch() } })}
        isPending={createWorkOrder.isPending}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-lg">Từ chối kế hoạch</h2>
              <button onClick={() => setRejectTarget(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="small text-muted">Kế hoạch {rejectTarget.planNo}</div>
              <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Lý do từ chối *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejectTarget(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
                <button
                  disabled={!rejectReason.trim() || rejectPlan.isPending}
                  onClick={() => rejectPlan.mutate({ id: rejectTarget.id, rejectReason: rejectReason.trim() }, { onSuccess: () => setRejectTarget(null) })}
                  className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
                  style={{ background: '#dc3545' }}
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Hủy kế hoạch"
        description={`Hủy kế hoạch ${cancelTarget?.planNo}?`}
        confirmLabel="Hủy kế hoạch"
        destructive
        isPending={cancelPlan.isPending}
        onConfirm={() => cancelTarget && cancelPlan.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })}
        onClose={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa kế hoạch"
        description={`Xóa kế hoạch ${deleteTarget?.planNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={deletePlan.isPending}
        onConfirm={() => deleteTarget && deletePlan.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Nhu cầu vật tư của kế hoạch — có thể chuyển thẳng sang lập yêu cầu mua */}
      {needsFor && (
        <MaterialNeedsDialog
          plan={needsFor}
          onClose={() => setNeedsFor(null)}
          onCreateRequest={(items) => {
            setNeedsFor(null)
            navigate('/machines/part-requests', {
              state: { presetItems: items, workPlanId: needsFor.id, type: needsFor.type, title: `Vật tư cho kế hoạch ${needsFor.planNo}` },
            })
          }}
        />
      )}

      {printTarget && <WorkPlanPrint plan={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}
