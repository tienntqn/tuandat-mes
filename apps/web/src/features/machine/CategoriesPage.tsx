import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useRestoreCategory } from './catalog.hooks'
import { categoryApi, type MachineCategory, type CreateCategoryDto } from './catalog.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { useAuthStore } from '@/stores/auth.store'

export default function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MachineCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MachineCategory | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useCategories({ search: search || undefined, page, pageSize: 20 })
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()
  const restoreCat = useRestoreCategory()

  const handleSubmit = (dto: CreateCategoryDto) => {
    if (editTarget) updateCat.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createCat.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  const exportRows = () => (data?.data ?? []).map((c) => ({ 'Mã': c.code, 'Tên chủng loại': c.name, 'Mô tả': c.description ?? '' }))
  const templateRows = [{ 'Mã': '', 'Tên chủng loại': 'Máy 1 kim', 'Mô tả': '' }]
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0, error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên chủng loại'])
      if (!name) { error++; continue }
      try { await categoryApi.create({ code: cellStr(row['Mã']) || undefined, name, description: cellStr(row['Mô tả']) || undefined }); success++ } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh mục Chủng loại máy"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Chủng loại' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Chủng loại" fileBase="chung-loai-may" exportRows={exportRows} templateRows={templateRows} onImport={canWrite ? handleImportRows : undefined} canWrite={canWrite} entityLabel="chủng loại" />
          {canWrite && <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white"><span><i className="fe fe-plus"></i></span> Thêm chủng loại</button>}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} chủng loại</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light"><tr><th>Mã</th><th>Tên chủng loại</th><th>Mô tả</th>{canWrite && <th className="text-end">Thao tác</th>}</tr></thead>
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
                  <td className="text-muted small">{c.description ?? '—'}</td>
                  {canWrite && (
                    <td className="text-end"><div className="d-flex justify-content-end gap-1">
                      {c.deletedAt ? (
                        <button onClick={() => restoreCat.mutate(c.id)} className="btn btn-sm btn-outline-secondary"><i className="fe fe-rotate-ccw"></i></button>
                      ) : (
                        <>
                          <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                          <button onClick={() => setDeleteTarget(c)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                        </>
                      )}
                    </div></td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <CategoryFormDialog open={formOpen} category={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createCat.isPending || updateCat.isPending} />

      <ConfirmDialog open={!!deleteTarget} title="Xóa chủng loại" description={`Xóa chủng loại "${deleteTarget?.name}"?`} confirmLabel="Xóa" destructive isPending={deleteCat.isPending} onConfirm={() => deleteTarget && deleteCat.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })} onClose={() => setDeleteTarget(null)} />
    </PageWrapper>
  )
}

function CategoryFormDialog({ open, category, onClose, onSubmit, isPending }: { open: boolean; category?: MachineCategory | null; onClose: () => void; onSubmit: (dto: CreateCategoryDto) => void; isPending?: boolean }) {
  const [form, setForm] = useState<CreateCategoryDto>({ code: '', name: '', description: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) { setForm(category ? { code: category.code, name: category.name, description: category.description ?? '' } : { code: '', name: '', description: '' }); setError('') }
  }, [open, category])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{category ? 'Cập nhật chủng loại' : 'Thêm chủng loại'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) { setError('Tên không được để trống'); return } onSubmit({ ...form, code: form.code?.trim() || undefined, description: form.description?.trim() || undefined }) }} className="p-5 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Mã (bỏ trống để tự sinh)</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: 1KIM" /></div>
          <div><label className="text-sm font-medium mb-1 block">Tên chủng loại *</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Máy 1 kim" />{error && <p className="text-xs text-destructive mt-1">{error}</p>}</div>
          <div><label className="text-sm font-medium mb-1 block">Mô tả</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{isPending ? 'Đang lưu...' : category ? 'Cập nhật' : 'Tạo mới'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
