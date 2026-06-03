import { useState } from 'react'
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, useRestoreOrder } from './order.hooks'
import { OrderFormDialog } from './OrderFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellDate } from '@/lib/excel'
import { useCustomersActive } from '@/features/customer/customer.hooks'
import { orderApi, ORDER_STATUS_LABELS, type Order, type CreateOrderDto } from './order.api'
import { useAuthStore } from '@/stores/auth.store'

const STATUS_BY_LABEL = Object.fromEntries(Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => [v, k]))

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Order | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data: customers = [] } = useCustomersActive()
  const { data, isLoading, refetch } = useOrders({ search: search || undefined, status: filterStatus || undefined, page, pageSize: 20 })
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const deleteOrder = useDeleteOrder()
  const restoreOrder = useRestoreOrder()

  const handleSubmit = (dto: CreateOrderDto) => {
    if (editTarget) {
      updateOrder.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createOrder.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

  const exportRows = () => (data?.data ?? []).map((o) => ({
    'Số đơn hàng': o.orderNumber,
    'Mã KH': o.customer?.code ?? '',
    'Khách hàng': o.customer?.name ?? '',
    'Ngày đặt': o.orderDate ? o.orderDate.split('T')[0] : '',
    'Ngày giao': o.deliveryDate ? o.deliveryDate.split('T')[0] : '',
    'Trạng thái': ORDER_STATUS_LABELS[o.status] ?? o.status,
    'Ghi chú': o.note ?? '',
  }))

  const templateRows = [
    { 'Số đơn hàng': '', 'Mã KH': 'KH001', 'Ngày đặt': '2026-06-01', 'Ngày giao': '2026-08-01', 'Trạng thái': 'Mở', 'Ghi chú': '' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const customerMap = new Map(customers.map((c) => [c.code.trim().toLowerCase(), c.id]))
    let success = 0
    let error = 0
    for (const row of rows) {
      const customerId = customerMap.get(cellStr(row['Mã KH']).toLowerCase())
      const orderDate = cellDate(row['Ngày đặt'])
      if (!customerId || !orderDate) { error++; continue }
      const deliveryDate = cellDate(row['Ngày giao'])
      try {
        await orderApi.create({
          orderNumber: cellStr(row['Số đơn hàng']) || undefined,
          customerId,
          orderDate,
          deliveryDate: deliveryDate || undefined,
          status: STATUS_BY_LABEL[cellStr(row['Trạng thái'])] ?? undefined,
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
      title="Đơn đặt hàng"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Đơn hàng' }, { label: 'Đơn đặt hàng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Đơn đặt hàng"
            fileBase="don-dat-hang"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="đơn hàng"
          />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Tạo đơn hàng
            </button>
          )}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tìm số đơn, khách hàng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} đơn hàng</small>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Số đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Ngày đặt</th>
                  <th>Ngày giao</th>
                  <th className="text-end">Số PO</th>
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
                  data?.data.map((o) => (
                    <tr key={o.id} className={o.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{o.orderNumber}</code></td>
                      <td>{o.customer?.name ?? '—'}</td>
                      <td>{formatDate(o.orderDate)}</td>
                      <td>{formatDate(o.deliveryDate)}</td>
                      <td className="text-end">{o._count?.purchaseOrders ?? 0}</td>
                      <td><StatusBadge status={o.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {o.deletedAt ? (
                              <button onClick={() => restoreOrder.mutate(o.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(o); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(o)} className="btn btn-sm btn-outline-danger">
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

      <OrderFormDialog open={formOpen} order={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createOrder.isPending || updateOrder.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa đơn hàng"
        description={`Bạn có chắc muốn xóa đơn hàng "${deleteTarget?.orderNumber}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteOrder.isPending}
        onConfirm={() => deleteTarget && deleteOrder.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
