import { useState } from 'react'
import { useColors, useCreateColor, useUpdateColor, useDeleteColor, useRestoreColor } from './color.hooks'
import { ColorFormDialog } from './ColorFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { colorApi, type Color, type CreateColorDto } from './color.api'
import { useAuthStore } from '@/stores/auth.store'

export default function ColorsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Color | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Color | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data, isLoading, refetch } = useColors({ search: search || undefined, page, pageSize: 20 })
  const createColor = useCreateColor()
  const updateColor = useUpdateColor()
  const deleteColor = useDeleteColor()
  const restoreColor = useRestoreColor()

  const handleSubmit = (dto: CreateColorDto) => {
    if (editTarget) {
      updateColor.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createColor.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const exportRows = () => (data?.data ?? []).map((c) => ({ 'Mã': c.code, 'Tên màu': c.name, 'Hex': c.hex ?? '' }))
  const templateRows = [{ 'Mã': '', 'Tên màu': 'Navy', 'Hex': '#1F2A56' }]
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0, error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên màu'])
      if (!name) { error++; continue }
      try {
        await colorApi.create({ code: cellStr(row['Mã']) || undefined, name, hex: cellStr(row['Hex']) || undefined })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh mục Màu"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Danh mục' }, { label: 'Màu' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar sheetName="Màu" fileBase="mau" exportRows={exportRows} templateRows={templateRows} onImport={canWrite ? handleImportRows : undefined} canWrite={canWrite} entityLabel="màu" />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm màu
            </button>
          )}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên màu..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} màu</small></div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã</th>
                  <th>Tên màu</th>
                  <th>Màu</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((c) => (
                    <tr key={c.id} className={c.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{c.code}</code></td>
                      <td className="fw-medium">{c.name}</td>
                      <td>
                        <span className="d-inline-flex align-items-center gap-2">
                          <span style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #ddd', background: c.hex ?? '#fff', display: 'inline-block' }} />
                          <span className="text-muted small">{c.hex ?? '—'}</span>
                        </span>
                      </td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {c.deletedAt ? (
                              <button onClick={() => restoreColor.mutate(c.id)} className="btn btn-sm btn-outline-secondary"><i className="fe fe-rotate-ccw"></i></button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                                <button onClick={() => setDeleteTarget(c)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <ColorFormDialog open={formOpen} color={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createColor.isPending || updateColor.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa màu"
        description={`Bạn có chắc muốn xóa màu "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteColor.isPending}
        onConfirm={() => deleteTarget && deleteColor.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
