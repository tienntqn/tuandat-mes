import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { usePurchaseOrders, useCreatePO, useUpdatePO, useDeletePO, useRestorePO } from './po.hooks'
import { POFormDialog } from './POFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PO_STATUS_LABELS, type PurchaseOrder, type CreatePODto } from './po.api'
import { useAuthStore } from '@/stores/auth.store'

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} PO</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"><RefreshCw className="h-4 w-4" /></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Tạo PO
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56" placeholder="Tìm số PO, mã hàng..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="rounded-lg border px-3 py-2 text-sm bg-background" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(PO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Số PO</th>
              <th className="px-4 py-3 text-left font-medium">Mã hàng</th>
              <th className="px-4 py-3 text-left font-medium">Khách hàng</th>
              <th className="px-4 py-3 text-right font-medium">Số lượng</th>
              <th className="px-4 py-3 text-left font-medium">Ngày giao</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((po) => (
                <tr key={po.id} className={`border-t hover:bg-muted/20 ${po.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.style?.code} — {po.style?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{po.style?.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{po.totalQuantity.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatDate(po.deliveryDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {po.deletedAt ? (
                          <button onClick={() => restorePO.mutate(po.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><RotateCcw className="h-4 w-4" /></button>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget(po); setFormOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget(po)} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-4 w-4" /></button>
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
    </div>
  )
}
