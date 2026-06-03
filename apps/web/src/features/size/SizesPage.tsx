import { useState } from 'react'
import { useSizes, useCreateSize, useUpdateSize, useDeleteSize, useRestoreSize } from './size.hooks'
import { SizeFormDialog } from './SizeFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellNum } from '@/lib/excel'
import { sizeApi, type Size, type CreateSizeDto } from './size.api'
import { useAuthStore } from '@/stores/auth.store'

export default function SizesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Size | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Size | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data, isLoading, refetch } = useSizes({ search: search || undefined, page, pageSize: 50 })
  const createSize = useCreateSize()
  const updateSize = useUpdateSize()
  const deleteSize = useDeleteSize()
  const restoreSize = useRestoreSize()

  const handleSubmit = (dto: CreateSizeDto) => {
    if (editTarget) {
      updateSize.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createSize.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const exportRows = () => (data?.data ?? []).map((s) => ({ 'Mã': s.code, 'Tên size': s.name, 'Thứ tự': s.sortOrder }))
  const templateRows = [{ 'Mã': 'XL', 'Tên size': 'XL', 'Thứ tự': 4 }]
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0, error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên size'])
      if (!name) { error++; continue }
      try {
        await sizeApi.create({ code: cellStr(row['Mã']) || undefined, name, sortOrder: cellNum(row['Thứ tự']) })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh mục Size"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Danh mục' }, { label: 'Size' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar sheetName="Size" fileBase="size" exportRows={exportRows} templateRows={templateRows} onImport={canWrite ? handleImportRows : undefined} canWrite={canWrite} entityLabel="size" />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm size
            </button>
          )}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên size..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} size</small></div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã</th>
                  <th>Tên size</th>
                  <th className="text-end">Thứ tự</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((s) => (
                    <tr key={s.id} className={s.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{s.code}</code></td>
                      <td className="fw-medium">{s.name}</td>
                      <td className="text-end text-muted">{s.sortOrder}</td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {s.deletedAt ? (
                              <button onClick={() => restoreSize.mutate(s.id)} className="btn btn-sm btn-outline-secondary"><i className="fe fe-rotate-ccw"></i></button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(s); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                                <button onClick={() => setDeleteTarget(s)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <SizeFormDialog open={formOpen} size={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createSize.isPending || updateSize.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa size"
        description={`Bạn có chắc muốn xóa size "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteSize.isPending}
        onConfirm={() => deleteTarget && deleteSize.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
