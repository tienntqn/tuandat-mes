import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand, useRestoreBrand } from './catalog.hooks'
import { brandApi, type MachineBrand, type CreateBrandDto } from './catalog.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { useAuthStore } from '@/stores/auth.store'

export default function BrandsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MachineBrand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MachineBrand | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useBrands({ search: search || undefined, page, pageSize: 20 })
  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()
  const deleteBrand = useDeleteBrand()
  const restoreBrand = useRestoreBrand()

  const handleSubmit = (dto: CreateBrandDto) => {
    if (editTarget) updateBrand.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createBrand.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  const exportRows = () => (data?.data ?? []).map((b) => ({ 'Mã': b.code, 'Tên hãng': b.name, 'Quốc gia': b.country ?? '', 'Ghi chú': b.note ?? '' }))
  const templateRows = [{ 'Mã': '', 'Tên hãng': 'Juki', 'Quốc gia': 'Nhật Bản', 'Ghi chú': '' }]
  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0, error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên hãng'])
      if (!name) { error++; continue }
      try { await brandApi.create({ code: cellStr(row['Mã']) || undefined, name, country: cellStr(row['Quốc gia']) || undefined, note: cellStr(row['Ghi chú']) || undefined }); success++ } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh mục Hãng sản xuất"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Hãng sản xuất' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Hãng" fileBase="hang-san-xuat" exportRows={exportRows} templateRows={templateRows} onImport={canWrite ? handleImportRows : undefined} canWrite={canWrite} entityLabel="hãng" />
          {canWrite && <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white"><span><i className="fe fe-plus"></i></span> Thêm hãng</button>}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên hãng..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} hãng</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light"><tr><th>Mã</th><th>Tên hãng</th><th>Quốc gia</th><th>Ghi chú</th>{canWrite && <th className="text-end">Thao tác</th>}</tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((b) => (
                <tr key={b.id} className={b.deletedAt ? 'opacity-50' : ''}>
                  <td><code>{b.code}</code></td>
                  <td className="fw-medium">{b.name}</td>
                  <td className="text-muted">{b.country ?? '—'}</td>
                  <td className="text-muted small">{b.note ?? '—'}</td>
                  {canWrite && (
                    <td className="text-end"><div className="d-flex justify-content-end gap-1">
                      {b.deletedAt ? (
                        <button onClick={() => restoreBrand.mutate(b.id)} className="btn btn-sm btn-outline-secondary"><i className="fe fe-rotate-ccw"></i></button>
                      ) : (
                        <>
                          <button onClick={() => { setEditTarget(b); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                          <button onClick={() => setDeleteTarget(b)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
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

      <BrandFormDialog open={formOpen} brand={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createBrand.isPending || updateBrand.isPending} />

      <ConfirmDialog open={!!deleteTarget} title="Xóa hãng" description={`Xóa hãng "${deleteTarget?.name}"?`} confirmLabel="Xóa" destructive isPending={deleteBrand.isPending} onConfirm={() => deleteTarget && deleteBrand.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })} onClose={() => setDeleteTarget(null)} />
    </PageWrapper>
  )
}

function BrandFormDialog({ open, brand, onClose, onSubmit, isPending }: { open: boolean; brand?: MachineBrand | null; onClose: () => void; onSubmit: (dto: CreateBrandDto) => void; isPending?: boolean }) {
  const [form, setForm] = useState<CreateBrandDto>({ code: '', name: '', country: '', note: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) { setForm(brand ? { code: brand.code, name: brand.name, country: brand.country ?? '', note: brand.note ?? '' } : { code: '', name: '', country: '', note: '' }); setError('') }
  }, [open, brand])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{brand ? 'Cập nhật hãng' : 'Thêm hãng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) { setError('Tên hãng không được để trống'); return } onSubmit({ ...form, code: form.code?.trim() || undefined, country: form.country?.trim() || undefined, note: form.note?.trim() || undefined }) }} className="p-5 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Mã (bỏ trống để tự sinh)</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: JUKI" /></div>
          <div><label className="text-sm font-medium mb-1 block">Tên hãng *</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Juki" />{error && <p className="text-xs text-destructive mt-1">{error}</p>}</div>
          <div><label className="text-sm font-medium mb-1 block">Quốc gia</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="VD: Nhật Bản" /></div>
          <div><label className="text-sm font-medium mb-1 block">Ghi chú</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{isPending ? 'Đang lưu...' : brand ? 'Cập nhật' : 'Tạo mới'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
