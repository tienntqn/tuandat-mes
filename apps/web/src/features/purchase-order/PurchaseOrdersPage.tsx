import { useState } from 'react'
import { usePurchaseOrders, useCreatePO, useUpdatePO, useDeletePO, useRestorePO } from './po.hooks'
import { POFormDialog } from './POFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellNum, cellDate } from '@/lib/excel'
import { useStylesActive } from '@/features/style/style.hooks'
import { useOrdersActive } from '@/features/order/order.hooks'
import { useColorsActive } from '@/features/color/color.hooks'
import { useSizesActive } from '@/features/size/size.hooks'
import { poApi, PO_STATUS_LABELS, type PurchaseOrder, type CreatePODto } from './po.api'
import { useAuthStore } from '@/stores/auth.store'

const PO_STATUS_BY_LABEL = Object.fromEntries(Object.entries(PO_STATUS_LABELS).map(([k, v]) => [v, k]))

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data: styles = [] } = useStylesActive()
  const { data: orders = [] } = useOrdersActive()
  const { data: colors = [] } = useColorsActive()
  const { data: sizes = [] } = useSizesActive()
  const { data, isLoading, refetch } = usePurchaseOrders({ search: search || undefined, status: filterStatus || undefined, page, pageSize: 20 })
  const createPO = useCreatePO()
  const updatePO = useUpdatePO()
  const deletePO = useDeletePO()
  const restorePO = useRestorePO()

  const handleSubmit = (dto: CreatePODto) => {
    if (editTarget) {
      updatePO.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createPO.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN')

  const colorIdByCode = new Map(colors.map((c) => [c.code.trim().toLowerCase(), c.id]))
  const sizeIdByCode = new Map(sizes.map((s) => [s.code.trim().toLowerCase(), s.id]))

  // Xuất định dạng "long": mỗi ô Màu × Size là 1 dòng (tải chi tiết PO để lấy items).
  // PO chưa khai báo màu/size → 1 dòng với cột Màu/Size trống, Số lượng = tổng PO.
  const exportRows = async () => {
    const list = data?.data ?? []
    const details = await Promise.all(list.map((po) => poApi.get(po.id)))
    const out: Record<string, string | number>[] = []
    for (const po of details) {
      const deliveryDate = po.deliveryDate ? po.deliveryDate.split('T')[0] : ''
      const statusLabel = PO_STATUS_LABELS[po.status] ?? po.status
      const orderNo = po.order?.orderNumber ?? ''
      const mk = (color: string, size: string, qty: number) => ({
        'Số PO': po.poNumber,
        'Mã hàng': po.style?.code ?? '',
        'Khách hàng': po.style?.customer?.name ?? '',
        'Màu': color,
        'Size': size,
        'Số lượng': qty,
        'Ngày giao': deliveryDate,
        'Trạng thái': statusLabel,
        'Đơn hàng': orderNo,
      })
      if (po.items && po.items.length > 0) {
        for (const it of po.items) out.push(mk(it.color?.code ?? '', it.size?.code ?? '', it.quantity))
      } else {
        out.push(mk('', '', po.totalQuantity))
      }
    }
    return out
  }

  const templateRows = [
    { 'Số PO': 'PO-2026-001', 'Mã hàng': 'MH001', 'Khách hàng': '', 'Màu': 'TRANG', 'Size': 'M', 'Số lượng': 500, 'Ngày giao': '2026-08-01', 'Trạng thái': 'Mở', 'Đơn hàng': '' },
    { 'Số PO': 'PO-2026-001', 'Mã hàng': 'MH001', 'Khách hàng': '', 'Màu': 'TRANG', 'Size': 'L', 'Số lượng': 500, 'Ngày giao': '2026-08-01', 'Trạng thái': 'Mở', 'Đơn hàng': '' },
  ]

  // Nhập theo nhóm: gộp các dòng cùng "Số PO" → 1 PO kèm ma trận items.
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const styleMap = new Map(styles.map((s) => [s.code.trim().toLowerCase(), s.id]))
    const orderMap = new Map(orders.map((o) => [o.orderNumber.trim().toLowerCase(), o.id]))

    const groups = new Map<string, Record<string, string | number>[]>()
    for (const row of rows) {
      const po = cellStr(row['Số PO'])
      if (!po) continue
      if (!groups.has(po)) groups.set(po, [])
      groups.get(po)!.push(row)
    }

    let success = 0
    let error = 0
    for (const [poNumber, grp] of groups) {
      const first = grp[0]
      const styleId = styleMap.get(cellStr(first['Mã hàng']).toLowerCase())
      const deliveryDate = cellDate(first['Ngày giao'])
      if (!styleId || !deliveryDate) { error++; continue }
      const orderId = orderMap.get(cellStr(first['Đơn hàng']).toLowerCase()) ?? null
      // Gom các ô màu×size có đủ Màu + Size + Số lượng > 0
      const items: { colorId: number; sizeId: number; quantity: number }[] = []
      for (const r of grp) {
        const colorId = colorIdByCode.get(cellStr(r['Màu']).toLowerCase())
        const sizeId = sizeIdByCode.get(cellStr(r['Size']).toLowerCase())
        const qty = cellNum(r['Số lượng'])
        if (colorId && sizeId && qty > 0) items.push({ colorId, sizeId, quantity: qty })
      }
      const totalQuantity = items.length ? items.reduce((s, i) => s + i.quantity, 0) : cellNum(first['Số lượng'])
      if (totalQuantity < 1) { error++; continue }
      try {
        await poApi.create({
          poNumber,
          styleId,
          totalQuantity,
          deliveryDate,
          status: PO_STATUS_BY_LABEL[cellStr(first['Trạng thái'])] ?? undefined,
          orderId,
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
      title="Purchase Orders"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Đơn hàng' }, { label: 'Purchase Order (PO)' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Purchase Orders"
            fileBase="purchase-orders"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="PO"
          />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Tạo PO
            </button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tìm số PO, mã hàng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(PO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} PO</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Số PO</th>
                  <th>Mã hàng</th>
                  <th>Khách hàng</th>
                  <th className="text-end">Số lượng</th>
                  <th>Ngày giao</th>
                  <th>Trạng thái</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((po) => (
                    <tr key={po.id} className={po.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{po.poNumber}</code></td>
                      <td>{po.style?.code} — {po.style?.name}</td>
                      <td className="text-muted">{po.style?.customer?.name ?? '—'}</td>
                      <td className="text-end fw-medium">{po.totalQuantity.toLocaleString()}</td>
                      <td>{formatDate(po.deliveryDate)}</td>
                      <td><StatusBadge status={po.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {po.deletedAt ? (
                              <button onClick={() => restorePO.mutate(po.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(po); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(po)} className="btn btn-sm btn-outline-danger">
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

      <POFormDialog open={formOpen} po={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createPO.isPending || updatePO.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa PO"
        description={`Bạn có chắc muốn xóa PO "${deleteTarget?.poNumber}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deletePO.isPending}
        onConfirm={() => deleteTarget && deletePO.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
