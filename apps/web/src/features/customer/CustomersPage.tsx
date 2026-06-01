import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useRestoreCustomer } from './customer.hooks'
import { CustomerFormDialog } from './CustomerFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import type { Customer, CreateCustomerDto } from './customer.api'
import { useAuthStore } from '@/stores/auth.store'

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data, isLoading, refetch } = useCustomers({ search: search || undefined, page, pageSize: 20 })
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const restoreCustomer = useRestoreCustomer()

  const handleSubmit = (dto: CreateCustomerDto) => {
    if (editTarget) {
      updateCustomer.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createCustomer.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Khách hàng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} khách hàng</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"><RefreshCw className="h-4 w-4" /></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </button>
          )}
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="rounded-lg border pl-9 pr-3 py-2 text-sm w-full" placeholder="Tìm mã, tên, quốc gia..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã</th>
              <th className="px-4 py-3 text-left font-medium">Tên khách hàng</th>
              <th className="px-4 py-3 text-left font-medium">Quốc gia</th>
              <th className="px-4 py-3 text-left font-medium">Thông tin liên hệ</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((c) => (
                <tr key={c.id} className={`border-t hover:bg-muted/20 ${c.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.country || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{c.contactInfo || '—'}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.deletedAt ? (
                          <button onClick={() => restoreCustomer.mutate(c.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><RotateCcw className="h-4 w-4" /></button>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-4 w-4" /></button>
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

      <CustomerFormDialog open={formOpen} customer={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createCustomer.isPending || updateCustomer.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa khách hàng"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteCustomer.isPending}
        onConfirm={() => deleteTarget && deleteCustomer.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
