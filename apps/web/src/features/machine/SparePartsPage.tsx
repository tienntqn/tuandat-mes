import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useSpareParts, useCreateSparePart, useUpdateSparePart, useDeleteSparePart, useRestoreSparePart, useCategoriesActive } from './catalog.hooks'
import { sparePartApi, type SparePart, type CreateSparePartDto } from './catalog.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { useAuthStore } from '@/stores/auth.store'

export default function SparePartsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SparePart | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useSpareParts({ search: search || undefined, page, pageSize: 20 })
  const { data: categories = [] } = useCategoriesActive()
  const createSp = useCreateSparePart()
  const updateSp = useUpdateSparePart()
  const deleteSp = useDeleteSparePart()
  const restoreSp = useRestoreSparePart()

  const handleSubmit = (dto: CreateSparePartDto) => {
    if (editTarget) updateSp.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createSp.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  const exportRows = () => (data?.data ?? []).map((p) => ({ 'Mã': p.code, 'Tên phụ tùng': p.name, 'Đơn vị': p.unit ?? '', 'Chủng loại': p.category?.name ?? '', 'Ghi chú': p.note ?? '' }))
  const templateRows = [{ 'Mã': '', 'Tên phụ tùng': 'Bo mạch', 'Đơn vị': 'cái', 'Chủng loại': '', 'Ghi chú': '' }]
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0, error = 0
    const catByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))
    for (const row of rows) {
      const name = cellStr(row['Tên phụ tùng'])
      if (!name) { error++; continue }
      try { await sparePartApi.create({ code: cellStr(row['Mã']) || undefined, name, unit: cellStr(row['Đơn vị']) || undefined, categoryId: catByName.get(cellStr(row['Chủng loại']).toLowerCase()), note: cellStr(row['Ghi chú']) || undefined }); success++ } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh mục Phụ tùng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Phụ tùng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Phụ tùng" fileBase="phu-tung" exportRows={exportRows} templateRows={templateRows} onImport={canWrite ? handleImportRows : undefined} canWrite={canWrite} entityLabel="phụ tùng" />
          {canWrite && <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white"><span><i className="fe fe-plus"></i></span> Thêm phụ tùng</button>}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên phụ tùng..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} phụ tùng</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light"><tr><th>Mã</th><th>Tên phụ tùng</th><th>Đơn vị</th><th>Chủng loại</th>{canWrite && <th className="text-end">Thao tác</th>}</tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((p) => (
                <tr key={p.id} className={p.deletedAt ? 'opacity-50' : ''}>
                  <td><code>{p.code}</code></td>
                  <td className="fw-medium">{p.name}</td>
                  <td className="text-muted">{p.unit ?? '—'}</td>
                  <td className="text-muted small">{p.category?.name ?? '—'}</td>
                  {canWrite && (
                    <td className="text-end"><div className="d-flex justify-content-end gap-1">
                      {p.deletedAt ? (
                        <button onClick={() => restoreSp.mutate(p.id)} className="btn btn-sm btn-outline-secondary"><i className="fe fe-rotate-ccw"></i></button>
                      ) : (
                        <>
                          <button onClick={() => { setEditTarget(p); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                          <button onClick={() => setDeleteTarget(p)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <SparePartFormDialog open={formOpen} part={editTarget} categories={categories} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createSp.isPending || updateSp.isPending} />

      <ConfirmDialog open={!!deleteTarget} title="Xóa phụ tùng" description={`Xóa phụ tùng "${deleteTarget?.name}"?`} confirmLabel="Xóa" destructive isPending={deleteSp.isPending} onConfirm={() => deleteTarget && deleteSp.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })} onClose={() => setDeleteTarget(null)} />
    </PageWrapper>
  )
}

function SparePartFormDialog({ open, part, categories, onClose, onSubmit, isPending }: { open: boolean; part?: SparePart | null; categories: { id: number; name: string }[]; onClose: () => void; onSubmit: (dto: CreateSparePartDto) => void; isPending?: boolean }) {
  const [form, setForm] = useState<CreateSparePartDto>({ code: '', name: '', unit: '', categoryId: undefined, note: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) { setForm(part ? { code: part.code, name: part.name, unit: part.unit ?? '', categoryId: part.categoryId ?? undefined, note: part.note ?? '' } : { code: '', name: '', unit: '', categoryId: undefined, note: '' }); setError('') }
  }, [open, part])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{part ? 'Cập nhật phụ tùng' : 'Thêm phụ tùng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) { setError('Tên không được để trống'); return } onSubmit({ ...form, code: form.code?.trim() || undefined, unit: form.unit?.trim() || undefined, note: form.note?.trim() || undefined }) }} className="p-5 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Mã (bỏ trống để tự sinh)</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="text-sm font-medium mb-1 block">Tên phụ tùng *</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Bo mạch" />{error && <p className="text-xs text-destructive mt-1">{error}</p>}</div>
          <div className="d-flex gap-2">
            <div className="flex-fill"><label className="text-sm font-medium mb-1 block">Đơn vị</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.unit ?? ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="cái" /></div>
            <div className="flex-fill"><label className="text-sm font-medium mb-1 block">Chủng loại</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— Không —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Ghi chú</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{isPending ? 'Đang lưu...' : part ? 'Cập nhật' : 'Tạo mới'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
