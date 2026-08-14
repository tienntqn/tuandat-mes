import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  useMaintenanceNorms,
  useCreateMaintenanceNorm,
  useUpdateMaintenanceNorm,
  useDeleteMaintenanceNorm,
} from './mmtb.hooks'
import { useCategoriesActive, useSparePartsActive } from './catalog.hooks'
import type { MaintenanceNorm, CreateMaintenanceNormDto, NormItemInput } from './mmtb.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

export default function MaintenanceNormsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MaintenanceNorm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceNorm | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useMaintenanceNorms({ search: search || undefined, page, pageSize: 20 })
  const { data: categories = [] } = useCategoriesActive()
  const createNorm = useCreateMaintenanceNorm()
  const updateNorm = useUpdateMaintenanceNorm()
  const deleteNorm = useDeleteMaintenanceNorm()

  const handleSubmit = (dto: CreateMaintenanceNormDto) => {
    if (editTarget) updateNorm.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createNorm.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  return (
    <PageWrapper
      title="Định mức bảo dưỡng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Định mức bảo dưỡng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm định mức
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Định mức quy định <strong>chu kỳ bảo dưỡng</strong>, <strong>hạng mục kiểm tra</strong> và <strong>vật tư tiêu hao chuẩn</strong>.
        Hệ thống dùng định mức này để dự tính kế hoạch bảo dưỡng và tính nhu cầu vật tư.
      </div>

      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm mã, tên định mức..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} định mức</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Mã</th><th>Tên định mức</th><th>Áp dụng cho</th>
              <th className="text-center">Chu kỳ</th><th className="text-end">Chi phí DK</th>
              <th className="text-center">Vật tư</th><th className="text-center">Trạng thái</th>
              {canWrite && <th className="text-end">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa khai báo định mức bảo dưỡng nào</td></tr>
            ) : (
              data?.data.map((n) => (
                <tr key={n.id}>
                  <td><code>{n.code}</code></td>
                  <td className="fw-medium">{n.name}</td>
                  <td className="small text-muted">
                    {n.machine ? `Máy ${n.machine.code}` : n.category ? `Chủng loại: ${n.category.name}` : '—'}
                  </td>
                  <td className="text-center">{n.intervalDays} ngày</td>
                  <td className="text-end">{n.estimatedCost != null ? Number(n.estimatedCost).toLocaleString('vi-VN') : '—'}</td>
                  <td className="text-center">{n.items?.length ?? 0}</td>
                  <td className="text-center">
                    {n.isActive
                      ? <span className="badge bg-success-transparent">Đang áp dụng</span>
                      : <span className="badge bg-secondary-transparent">Ngừng</span>}
                  </td>
                  {canWrite && (
                    <td className="text-end"><div className="d-flex justify-content-end gap-1">
                      <button onClick={() => { setEditTarget(n); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                      <button onClick={() => setDeleteTarget(n)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                    </div></td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <NormFormDialog
        open={formOpen}
        norm={editTarget}
        categories={categories}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createNorm.isPending || updateNorm.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa định mức"
        description={`Xóa định mức "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteNorm.isPending}
        onConfirm={() => deleteTarget && deleteNorm.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}

const emptyForm: CreateMaintenanceNormDto = {
  code: '', name: '', categoryId: undefined, intervalDays: 90,
  estimatedHours: undefined, estimatedCost: undefined, checklist: '', description: '', isActive: true, items: [],
}

function NormFormDialog({
  open, norm, categories, onClose, onSubmit, isPending,
}: {
  open: boolean
  norm?: MaintenanceNorm | null
  categories: { id: number; name: string }[]
  onClose: () => void
  onSubmit: (dto: CreateMaintenanceNormDto) => void
  isPending?: boolean
}) {
  const [form, setForm] = useState<CreateMaintenanceNormDto>(emptyForm)
  const [items, setItems] = useState<NormItemInput[]>([])
  const [error, setError] = useState('')
  const { data: spareParts = [] } = useSparePartsActive()

  useEffect(() => {
    if (!open) return
    setError('')
    if (norm) {
      setForm({
        code: norm.code,
        name: norm.name,
        categoryId: norm.categoryId ?? undefined,
        machineId: norm.machineId ?? undefined,
        intervalDays: norm.intervalDays,
        estimatedHours: norm.estimatedHours != null ? Number(norm.estimatedHours) : undefined,
        estimatedCost: norm.estimatedCost != null ? Number(norm.estimatedCost) : undefined,
        checklist: norm.checklist ?? '',
        description: norm.description ?? '',
        isActive: norm.isActive,
      })
      setItems((norm.items ?? []).map((it) => ({
        sparePartId: it.sparePartId ?? undefined,
        name: it.name,
        unit: it.unit ?? undefined,
        quantity: Number(it.quantity),
        note: it.note ?? undefined,
      })))
    } else {
      setForm(emptyForm)
      setItems([])
    }
  }, [open, norm])

  if (!open) return null

  const addItem = () => setItems([...items, { name: '', quantity: 1 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<NormItemInput>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  // Chọn phụ tùng từ danh mục thì lấy luôn tên và đơn vị
  const pickSparePart = (idx: number, sparePartId: string) => {
    if (!sparePartId) { updateItem(idx, { sparePartId: undefined }); return }
    const sp = spareParts.find((p) => p.id === Number(sparePartId))
    updateItem(idx, { sparePartId: Number(sparePartId), name: sp?.name ?? items[idx].name, unit: sp?.unit ?? items[idx].unit })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Tên định mức không được để trống'); return }
    if (!form.categoryId && !form.machineId) { setError('Phải chọn chủng loại máy hoặc một máy cụ thể'); return }
    if (!form.intervalDays || form.intervalDays < 1) { setError('Chu kỳ bảo dưỡng phải lớn hơn 0 ngày'); return }
    const cleanItems = items.filter((it) => it.name.trim())
    onSubmit({
      ...form,
      code: form.code?.trim() || undefined,
      checklist: form.checklist?.trim() || undefined,
      description: form.description?.trim() || undefined,
      items: cleanItems,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{norm ? 'Cập nhật định mức' : 'Thêm định mức bảo dưỡng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="d-flex gap-2">
            <div style={{ width: 160 }}>
              <label className="text-sm font-medium mb-1 block">Mã (tự sinh)</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Tên định mức *</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Bảo dưỡng định kỳ máy 1 kim - 3 tháng" />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Áp dụng cho chủng loại máy</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— Chọn chủng loại —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ width: 140 }}>
              <label className="text-sm font-medium mb-1 block">Chu kỳ (ngày) *</label>
              <input type="number" min={1} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: Number(e.target.value) })} />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Thời gian dự kiến (giờ)</label>
              <input type="number" min={0} step="0.5" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.estimatedHours ?? ''} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Chi phí dự kiến (đ)</label>
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.estimatedCost ?? ''} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Hạng mục kiểm tra (mỗi dòng một mục)</label>
            <textarea rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.checklist ?? ''} onChange={(e) => setForm({ ...form, checklist: e.target.value })} placeholder={'Vệ sinh tổng thể máy\nTra dầu, mỡ các khớp\nKiểm tra dây curoa\nKiểm tra hệ thống điện'} />
          </div>

          {/* Định mức vật tư cho một lần bảo dưỡng */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-sm font-medium">Vật tư tiêu hao định mức</label>
              <button type="button" onClick={addItem} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                <Plus size={14} /> Thêm vật tư
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-muted small border rounded-lg p-3 text-center">Chưa có vật tư định mức</div>
            ) : (
              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr><th style={{ width: '35%' }}>Phụ tùng</th><th>Tên</th><th style={{ width: 90 }}>SL</th><th style={{ width: 90 }}>ĐVT</th><th style={{ width: 40 }}></th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="form-select form-select-sm" value={it.sparePartId ?? ''} onChange={(e) => pickSparePart(idx, e.target.value)}>
                            <option value="">— Nhập tay —</option>
                            {spareParts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                          </select>
                        </td>
                        <td><input className="form-control form-control-sm" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} placeholder="Tên vật tư" /></td>
                        <td><input type="number" min={0} step="0.1" className="form-control form-control-sm" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} /></td>
                        <td><input className="form-control form-control-sm" value={it.unit ?? ''} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="cái" /></td>
                        <td className="text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="btn btn-sm btn-outline-danger px-2"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="normActive" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <label className="form-check-label small" htmlFor="normActive">Đang áp dụng</label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : norm ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
