import { useState } from 'react'
import { useDeliveryPlans, useCreateDeliveryPlan, useUpdateDeliveryPlan, useDeleteDeliveryPlan, useRestoreDeliveryPlan } from './delivery.hooks'
import { DeliveryPlanFormDialog } from './DeliveryPlanFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellNum, cellDate } from '@/lib/excel'
import { usePurchaseOrders } from '@/features/purchase-order/po.hooks'
import { deliveryApi, DELIVERY_STATUS_LABELS, type DeliveryPlan, type CreateDeliveryPlanDto } from './delivery.api'
import { useAuthStore } from '@/stores/auth.store'

const DELIVERY_STATUS_BY_LABEL = Object.fromEntries(Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => [v, k]))

export default function DeliveryPlansPage() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DeliveryPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeliveryPlan | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER') || hasRole('FACTORY_PLANNER')

  const { data: poData } = usePurchaseOrders({ pageSize: 200 })
  const pos = poData?.data ?? []
  const { data, isLoading, refetch } = useDeliveryPlans({ status: filterStatus || undefined, page, pageSize: 20 })
  const createPlan = useCreateDeliveryPlan()
  const updatePlan = useUpdateDeliveryPlan()
  const deletePlan = useDeleteDeliveryPlan()
  const restorePlan = useRestoreDeliveryPlan()

  const handleSubmit = (dto: CreateDeliveryPlanDto) => {
    if (editTarget) {
      updatePlan.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createPlan.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

  const exportRows = () => (data?.data ?? []).map((p) => ({
    'PO': p.po?.poNumber ?? '',
    'Mã hàng': p.po?.style?.code ?? '',
    'Ngày giao dự kiến': p.plannedDate ? p.plannedDate.split('T')[0] : '',
    'SL dự kiến': p.plannedQuantity,
    'Ngày giao thực tế': p.actualDate ? p.actualDate.split('T')[0] : '',
    'SL thực giao': p.actualQuantity ?? '',
    'Trạng thái': DELIVERY_STATUS_LABELS[p.status] ?? p.status,
    'Ghi chú': p.note ?? '',
  }))

  const templateRows = [
    { 'PO': 'PO-2026-001', 'Ngày giao dự kiến': '2026-08-01', 'SL dự kiến': 500, 'Ngày giao thực tế': '', 'SL thực giao': '', 'Trạng thái': 'Chờ giao', 'Ghi chú': '' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const poMap = new Map(pos.map((p) => [p.poNumber.trim().toLowerCase(), p.id]))
    let success = 0
    let error = 0
    for (const row of rows) {
      const poId = poMap.get(cellStr(row['PO']).toLowerCase())
      const plannedDate = cellDate(row['Ngày giao dự kiến'])
      const plannedQuantity = cellNum(row['SL dự kiến'])
      if (!poId || !plannedDate || plannedQuantity < 1) { error++; continue }
      const actualDate = cellDate(row['Ngày giao thực tế'])
      const actualQtyRaw = cellStr(row['SL thực giao'])
      try {
        await deliveryApi.create({
          poId,
          plannedDate,
          plannedQuantity,
          actualDate: actualDate || undefined,
          actualQuantity: actualQtyRaw ? cellNum(actualQtyRaw) : undefined,
          status: DELIVERY_STATUS_BY_LABEL[cellStr(row['Trạng thái'])] ?? undefined,
          note: cellStr(row['Ghi chú']) || undefined,
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Kế hoạch giao hàng"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Kế hoạch giao hàng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Kế hoạch giao hàng"
            fileBase="ke-hoach-giao-hang"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="kế hoạch"
          />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Tạo kế hoạch
            </button>
          )}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} kế hoạch</small>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>PO</th>
                  <th>Mã hàng</th>
                  <th>Ngày giao dự kiến</th>
                  <th className="text-end">SL dự kiến</th>
                  <th>Ngày giao thực tế</th>
                  <th className="text-end">SL thực giao</th>
                  <th>Trạng thái</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((p) => (
                    <tr key={p.id} className={p.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{p.po?.poNumber}</code></td>
                      <td className="text-muted">{p.po?.style?.code ?? '—'}</td>
                      <td>{formatDate(p.plannedDate)}</td>
                      <td className="text-end fw-medium">{p.plannedQuantity.toLocaleString()}</td>
                      <td>{formatDate(p.actualDate)}</td>
                      <td className="text-end">{p.actualQuantity != null ? p.actualQuantity.toLocaleString() : '—'}</td>
                      <td><StatusBadge status={p.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {p.deletedAt ? (
                              <button onClick={() => restorePlan.mutate(p.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(p); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(p)} className="btn btn-sm btn-outline-danger">
                                  <i className="fe fe-trash-2"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <DeliveryPlanFormDialog open={formOpen} plan={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createPlan.isPending || updatePlan.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa kế hoạch giao hàng"
        description={`Xóa kế hoạch giao hàng của PO "${deleteTarget?.po?.poNumber}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deletePlan.isPending}
        onConfirm={() => deleteTarget && deletePlan.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
