import { useState } from 'react'
import { useDeliveryPlans, useCreateDeliveryPlan, useUpdateDeliveryPlan, useDeleteDeliveryPlan, useRestoreDeliveryPlan } from './delivery.hooks'
import { DeliveryPlanFormDialog } from './DeliveryPlanFormDialog'
import { PackingListDialog } from './PackingListDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellNum, cellDate } from '@/lib/excel'
import { usePurchaseOrders } from '@/features/purchase-order/po.hooks'
import { useColorsActive } from '@/features/color/color.hooks'
import { useSizesActive } from '@/features/size/size.hooks'
import { deliveryApi, DELIVERY_STATUS_LABELS, type DeliveryPlan, type CreateDeliveryPlanDto } from './delivery.api'
import { useAuthStore } from '@/stores/auth.store'

const DELIVERY_STATUS_BY_LABEL = Object.fromEntries(Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => [v, k]))

export default function DeliveryPlansPage() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DeliveryPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeliveryPlan | null>(null)
  const [packingTarget, setPackingTarget] = useState<DeliveryPlan | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER') || hasRole('FACTORY_PLANNER')

  const { data: poData } = usePurchaseOrders({ pageSize: 200 })
  const pos = poData?.data ?? []
  const { data: colors = [] } = useColorsActive()
  const { data: sizes = [] } = useSizesActive()
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

  const colorIdByCode = new Map(colors.map((c) => [c.code.trim().toLowerCase(), c.id]))
  const sizeIdByCode = new Map(sizes.map((s) => [s.code.trim().toLowerCase(), s.id]))

  // Xuất định dạng "long": mỗi ô Màu × Size của phiếu đóng gói là 1 dòng (tải chi tiết để lấy items).
  const exportRows = async () => {
    const list = data?.data ?? []
    const details = await Promise.all(list.map((p) => deliveryApi.get(p.id)))
    const out: Record<string, string | number>[] = []
    for (const p of details) {
      const plannedDate = p.plannedDate ? p.plannedDate.split('T')[0] : ''
      const actualDate = p.actualDate ? p.actualDate.split('T')[0] : ''
      const statusLabel = DELIVERY_STATUS_LABELS[p.status] ?? p.status
      const mk = (color: string, size: string, qty: number | string) => ({
        'PO': p.po?.poNumber ?? '',
        'Mã hàng': p.po?.style?.code ?? '',
        'Ngày giao dự kiến': plannedDate,
        'SL dự kiến': p.plannedQuantity,
        'Ngày giao thực tế': actualDate,
        'Màu': color,
        'Size': size,
        'SL thực giao': qty,
        'Trạng thái': statusLabel,
        'Ghi chú': p.note ?? '',
      })
      if (p.items && p.items.length > 0) {
        for (const it of p.items) out.push(mk(it.color?.code ?? '', it.size?.code ?? '', it.quantity))
      } else {
        out.push(mk('', '', p.actualQuantity ?? ''))
      }
    }
    return out
  }

  const templateRows = [
    { 'PO': 'PO-2026-001', 'Mã hàng': 'MH001', 'Ngày giao dự kiến': '2026-08-01', 'SL dự kiến': 1000, 'Ngày giao thực tế': '2026-08-01', 'Màu': 'TRANG', 'Size': 'M', 'SL thực giao': 500, 'Trạng thái': 'Đã giao', 'Ghi chú': '' },
    { 'PO': 'PO-2026-001', 'Mã hàng': 'MH001', 'Ngày giao dự kiến': '2026-08-01', 'SL dự kiến': 1000, 'Ngày giao thực tế': '2026-08-01', 'Màu': 'TRANG', 'Size': 'L', 'SL thực giao': 500, 'Trạng thái': 'Đã giao', 'Ghi chú': '' },
  ]

  // Nhập theo nhóm: gộp các dòng cùng (PO + Ngày giao dự kiến) → 1 lần giao kèm phiếu đóng gói màu×size.
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const poMap = new Map(pos.map((p) => [p.poNumber.trim().toLowerCase(), p.id]))

    const groups = new Map<string, Record<string, string | number>[]>()
    for (const row of rows) {
      const po = cellStr(row['PO'])
      const plannedDate = cellDate(row['Ngày giao dự kiến'])
      if (!po || !plannedDate) continue
      const key = `${po.toLowerCase()}__${plannedDate}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(row)
    }

    let success = 0
    let error = 0
    for (const grp of groups.values()) {
      const first = grp[0]
      const poId = poMap.get(cellStr(first['PO']).toLowerCase())
      const plannedDate = cellDate(first['Ngày giao dự kiến'])
      const plannedQuantity = cellNum(first['SL dự kiến'])
      if (!poId || !plannedDate || plannedQuantity < 1) { error++; continue }
      const actualDate = cellDate(first['Ngày giao thực tế'])
      // Gom các ô màu×size có đủ Màu + Size + SL thực giao > 0
      const items: { colorId: number; sizeId: number; quantity: number }[] = []
      for (const r of grp) {
        const colorId = colorIdByCode.get(cellStr(r['Màu']).toLowerCase())
        const sizeId = sizeIdByCode.get(cellStr(r['Size']).toLowerCase())
        const qty = cellNum(r['SL thực giao'])
        if (colorId && sizeId && qty > 0) items.push({ colorId, sizeId, quantity: qty })
      }
      const actualRaw = cellStr(first['SL thực giao'])
      try {
        await deliveryApi.create({
          poId,
          plannedDate,
          plannedQuantity,
          actualDate: actualDate || undefined,
          actualQuantity: items.length ? undefined : (actualRaw ? cellNum(actualRaw) : undefined),
          status: DELIVERY_STATUS_BY_LABEL[cellStr(first['Trạng thái'])] ?? undefined,
          note: cellStr(first['Ghi chú']) || undefined,
          items: items.length ? items : undefined,
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
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Kế hoạch sản xuất' }, { label: 'Kế hoạch giao hàng' }]}
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
                  <th className="text-end">Thao tác</th>
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
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button onClick={() => setPackingTarget(p)} className="btn btn-sm btn-outline-info" title="Phiếu đóng gói">
                            <i className="fe fe-package"></i>
                          </button>
                          {canWrite && (p.deletedAt ? (
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
                          ))}
                        </div>
                      </td>
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

      <PackingListDialog open={!!packingTarget} planId={packingTarget?.id ?? null} onClose={() => setPackingTarget(null)} />

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
