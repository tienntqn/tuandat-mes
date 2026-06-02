import { useState } from 'react'
import { useLines, useCreateLine, useUpdateLine, useDeleteLine, useRestoreLine } from './line.hooks'
import { LineFormDialog } from './LineFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
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
    <PageWrapper
      title="Danh sách Chuyền"
      breadcrumbs={[{ label: 'Danh mục' }, { label: 'Chuyền may' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Thêm chuyền
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
              placeholder="Tìm tên chuyền..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={filterFactoryId ?? ''}
            onChange={(e) => { setFilterFactoryId(e.target.value ? +e.target.value : undefined); setPage(1) }}
          >
            <option value="">Tất cả xưởng</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} chuyền</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Số chuyền</th>
                  <th>Tên chuyền</th>
                  <th>Xưởng</th>
                  <th>Năng lực/ngày</th>
                  <th>Trạng thái</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((line) => (
                    <tr key={line.id} className={line.deletedAt ? 'opacity-50' : ''}>
                      <td className="fw-medium">Chuyền {line.lineNumber}</td>
                      <td>{line.name}</td>
                      <td className="text-muted">
                        {line.factory ? `${line.factory.code} — ${line.factory.name}` : '—'}
                      </td>
                      <td>{line.capacity > 0 ? `${line.capacity} SP` : '—'}</td>
                      <td><StatusBadge status={line.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {line.deletedAt ? (
                              <button onClick={() => restoreLine.mutate(line.id)} title="Khôi phục" className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(line); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(line)} className="btn btn-sm btn-outline-danger">
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
    </PageWrapper>
  )
}
