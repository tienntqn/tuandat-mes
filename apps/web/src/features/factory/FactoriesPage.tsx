import { useState } from 'react'
import { useFactories, useCreateFactory, useUpdateFactory, useDeleteFactory, useRestoreFactory } from './factory.hooks'
import { FactoryFormDialog } from './FactoryFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { factoryApi, type Factory, type CreateFactoryDto } from './factory.api'
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

  const exportRows = () => (data?.data ?? []).map((f) => ({
    'Mã': f.code,
    'Tên xưởng': f.name,
    'Địa chỉ': f.address ?? '',
    'SĐT': f.phone ?? '',
    'Trạng thái': f.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động',
  }))

  const templateRows = [
    { 'Mã': '', 'Tên xưởng': 'Xưởng 1', 'Địa chỉ': 'KCN ABC', 'SĐT': '0900000000', 'Trạng thái': 'Hoạt động' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0
    let error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên xưởng'])
      if (!name) { error++; continue }
      try {
        await factoryApi.create({
          code: cellStr(row['Mã']) || undefined,
          name,
          address: cellStr(row['Địa chỉ']) || undefined,
          phone: cellStr(row['SĐT']) || undefined,
          status: cellStr(row['Trạng thái']) === 'Ngừng hoạt động' ? 'INACTIVE' : 'ACTIVE',
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh sách Xưởng"
      breadcrumbs={[{ label: 'Quản lý nhà máy' }, { label: 'Quản lý xưởng may' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Xưởng"
            fileBase="xuong"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="xưởng"
          />
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Thêm xưởng
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
              placeholder="Tìm mã, tên xưởng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} xưởng</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã</th>
                  <th>Tên xưởng</th>
                  <th>Địa chỉ</th>
                  <th>SĐT</th>
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
                  data?.data.map((factory) => (
                    <tr key={factory.id} className={factory.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{factory.code}</code></td>
                      <td className="fw-medium">{factory.name}</td>
                      <td className="text-muted">{factory.address || '—'}</td>
                      <td className="text-muted">{factory.phone || '—'}</td>
                      <td><StatusBadge status={factory.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {factory.deletedAt ? (
                              <button
                                onClick={() => restoreFactory.mutate(factory.id)}
                                title="Khôi phục"
                                className="btn btn-sm btn-outline-secondary"
                              >
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditTarget(factory); setFormOpen(true) }}
                                  title="Chỉnh sửa"
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(factory)}
                                  title="Xóa"
                                  className="btn btn-sm btn-outline-danger"
                                >
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
    </PageWrapper>
  )
}
