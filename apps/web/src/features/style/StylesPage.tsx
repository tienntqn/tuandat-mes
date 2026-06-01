import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { useStyles, useCreateStyle, useUpdateStyle, useDeleteStyle, useRestoreStyle } from './style.hooks'
import { StyleFormDialog } from './StyleFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { useCustomersActive } from '@/features/customer/customer.hooks'
import type { Style, CreateStyleDto } from './style.api'
import { useAuthStore } from '@/stores/auth.store'

export default function StylesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState<number | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Style | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Style | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data: customers = [] } = useCustomersActive()
  const { data, isLoading, refetch } = useStyles({ search: search || undefined, customerId: filterCustomerId, page, pageSize: 20 })
  const createStyle = useCreateStyle()
  const updateStyle = useUpdateStyle()
  const deleteStyle = useDeleteStyle()
  const restoreStyle = useRestoreStyle()

  const handleSubmit = (dto: CreateStyleDto) => {
    if (editTarget) {
      updateStyle.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createStyle.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Mã hàng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} mã hàng</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"><RefreshCw className="h-4 w-4" /></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Thêm mã hàng
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56" placeholder="Tìm mã, tên..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="rounded-lg border px-3 py-2 text-sm bg-background" value={filterCustomerId ?? ''} onChange={(e) => { setFilterCustomerId(e.target.value ? +e.target.value : undefined); setPage(1) }}>
          <option value="">Tất cả khách hàng</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã hàng</th>
              <th className="px-4 py-3 text-left font-medium">Tên</th>
              <th className="px-4 py-3 text-left font-medium">Khách hàng</th>
              <th className="px-4 py-3 text-left font-medium">Mùa vụ</th>
              <th className="px-4 py-3 text-left font-medium">SAM</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((s) => (
                <tr key={s.id} className={`border-t hover:bg-muted/20 ${s.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.image && <img src={s.image} className="h-8 w-8 rounded object-cover" alt="" />}
                      <span className="font-mono text-xs font-medium">{s.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.season || '—'}</td>
                  <td className="px-4 py-3">{s.sam ? `${s.sam} phút` : '—'}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.deletedAt ? (
                          <button onClick={() => restoreStyle.mutate(s.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><RotateCcw className="h-4 w-4" /></button>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget(s); setFormOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-4 w-4" /></button>
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

      <StyleFormDialog open={formOpen} style={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createStyle.isPending || updateStyle.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa mã hàng"
        description={`Bạn có chắc muốn xóa mã hàng "${deleteTarget?.code}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteStyle.isPending}
        onConfirm={() => deleteTarget && deleteStyle.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
