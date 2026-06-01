import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { useFactories, useCreateFactory, useUpdateFactory, useDeleteFactory, useRestoreFactory } from './factory.hooks'
import { FactoryFormDialog } from './FactoryFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Factory, CreateFactoryDto } from './factory.api'
import { useAuthStore } from '@/stores/auth.store'

export default function FactoriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Factory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Factory | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD')

  const params = { search: search || undefined, status: status || undefined, page, pageSize: 20 }
  const { data, isLoading, refetch } = useFactories(params)
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const deleteFactory = useDeleteFactory()
  const restoreFactory = useRestoreFactory()

  const handleSubmit = (dto: CreateFactoryDto) => {
    if (editTarget) {
      updateFactory.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createFactory.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteFactory.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Xưởng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} xưởng</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Thêm xưởng
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Tìm mã, tên xưởng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã</th>
              <th className="px-4 py-3 text-left font-medium">Tên xưởng</th>
              <th className="px-4 py-3 text-left font-medium">Địa chỉ</th>
              <th className="px-4 py-3 text-left font-medium">SĐT</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((factory) => (
                <tr key={factory.id} className={`border-t hover:bg-muted/20 ${factory.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{factory.code}</td>
                  <td className="px-4 py-3 font-medium">{factory.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{factory.address || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{factory.phone || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={factory.status} /></td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {factory.deletedAt ? (
                          <button
                            onClick={() => restoreFactory.mutate(factory.id)}
                            title="Khôi phục"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditTarget(factory); setFormOpen(true) }}
                              title="Chỉnh sửa"
                              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(factory)}
                              title="Xóa"
                              className="p-1.5 rounded hover:bg-accent text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}

      <FactoryFormDialog
        open={formOpen}
        factory={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createFactory.isPending || updateFactory.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa xưởng"
        description={`Bạn có chắc muốn xóa xưởng "${deleteTarget?.name}"? Hành động này có thể khôi phục.`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteFactory.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
