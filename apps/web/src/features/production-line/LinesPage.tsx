import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { useLines, useCreateLine, useUpdateLine, useDeleteLine, useRestoreLine } from './line.hooks'
import { LineFormDialog } from './LineFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useFactories } from '@/features/factory/factory.hooks'
import type { ProductionLine, CreateLineDto } from './line.api'
import { useAuthStore } from '@/stores/auth.store'

export default function LinesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterFactoryId, setFilterFactoryId] = useState<number | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductionLine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionLine | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data: factoriesData } = useFactories({ status: 'ACTIVE', pageSize: 200 })
  const factories = factoriesData?.data ?? []

  const params = { factoryId: filterFactoryId, search: search || undefined, page, pageSize: 20 }
  const { data, isLoading, refetch } = useLines(params)
  const createLine = useCreateLine()
  const updateLine = useUpdateLine()
  const deleteLine = useDeleteLine()
  const restoreLine = useRestoreLine()

  const handleSubmit = (dto: CreateLineDto) => {
    if (editTarget) {
      updateLine.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createLine.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Chuyền</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} chuyền</p>
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
              Thêm chuyền
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Tìm tên chuyền..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterFactoryId ?? ''}
          onChange={(e) => { setFilterFactoryId(e.target.value ? +e.target.value : undefined); setPage(1) }}
        >
          <option value="">Tất cả xưởng</option>
          {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Số chuyền</th>
              <th className="px-4 py-3 text-left font-medium">Tên chuyền</th>
              <th className="px-4 py-3 text-left font-medium">Xưởng</th>
              <th className="px-4 py-3 text-left font-medium">Năng lực/ngày</th>
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
              data?.data.map((line) => (
                <tr key={line.id} className={`border-t hover:bg-muted/20 ${line.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium">Chuyền {line.lineNumber}</td>
                  <td className="px-4 py-3">{line.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {line.factory ? `${line.factory.code} — ${line.factory.name}` : '—'}
                  </td>
                  <td className="px-4 py-3">{line.capacity > 0 ? `${line.capacity} SP` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={line.status} /></td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {line.deletedAt ? (
                          <button onClick={() => restoreLine.mutate(line.id)} title="Khôi phục" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget(line); setFormOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(line)} className="p-1.5 rounded hover:bg-accent text-destructive">
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

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <LineFormDialog
        open={formOpen}
        line={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createLine.isPending || updateLine.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa chuyền"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteLine.isPending}
        onConfirm={() => deleteTarget && deleteLine.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
