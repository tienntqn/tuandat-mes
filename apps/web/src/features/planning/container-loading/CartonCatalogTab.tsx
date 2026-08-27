import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/lib/toast'
import { useCartonTypes, useCreateCartonType, useUpdateCartonType, useDeleteCartonType } from './carton-type.hooks'
import type { CartonType } from './carton-type.api'

interface CartonCatalogTabProps {
  customers: { id: number; code: string; name: string }[]
  customerId: number | undefined
  onCustomerChange: (id: number | undefined) => void
}

const emptyForm = { label: '', length: '', width: '', height: '' }

export function CartonCatalogTab({ customers, customerId, onCustomerChange }: CartonCatalogTabProps) {
  const { data: cartonTypes, isLoading } = useCartonTypes(customerId)
  const createMutation = useCreateCartonType()
  const updateMutation = useUpdateCartonType(customerId)
  const deleteMutation = useDeleteCartonType(customerId)

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<CartonType | null>(null)

  // Người dùng nhập kích thước thùng theo cm (trực quan hơn với carton thực tế), nhưng lưu trữ
  // và tính toán nội bộ vẫn theo mét (khớp đơn vị container) — quy đổi ngay tại biên nhập/hiển thị.
  const CM_PER_M = 100

  function handleAdd() {
    if (!customerId) {
      toast.error('Vui lòng chọn khách hàng trước')
      return
    }
    const length = Number(form.length) / CM_PER_M
    const width = Number(form.width) / CM_PER_M
    const height = Number(form.height) / CM_PER_M
    if (!form.label.trim()) {
      toast.error('Vui lòng nhập tên thùng')
      return
    }
    if (!(length > 0) || !(width > 0) || !(height > 0)) {
      toast.error('Kích thước dài/rộng/cao phải lớn hơn 0')
      return
    }
    createMutation.mutate(
      { customerId, label: form.label.trim(), length, width, height },
      { onSuccess: () => setForm(emptyForm) },
    )
  }

  function startEdit(ct: CartonType) {
    setEditingId(ct.id)
    setEditForm({
      label: ct.label,
      length: (Number(ct.length) * CM_PER_M).toFixed(1),
      width: (Number(ct.width) * CM_PER_M).toFixed(1),
      height: (Number(ct.height) * CM_PER_M).toFixed(1),
    })
  }

  function saveEdit(id: number) {
    const length = Number(editForm.length) / CM_PER_M
    const width = Number(editForm.width) / CM_PER_M
    const height = Number(editForm.height) / CM_PER_M
    if (!editForm.label.trim() || !(length > 0) || !(width > 0) || !(height > 0)) {
      toast.error('Dữ liệu không hợp lệ')
      return
    }
    updateMutation.mutate(
      { id, dto: { label: editForm.label.trim(), length, width, height } },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="mb-4" style={{ maxWidth: 360 }}>
          <label className="form-label">Khách hàng</label>
          <select
            className="form-select"
            value={customerId ?? ''}
            onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
        </div>

        {!customerId ? (
          <p className="text-muted mb-0">Chọn 1 khách hàng để xem/quản lý danh mục thùng của khách đó.</p>
        ) : (
          <>
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Tên thùng</th>
                    <th style={{ width: 110 }}>Dài (cm)</th>
                    <th style={{ width: 110 }}>Rộng (cm)</th>
                    <th style={{ width: 110 }}>Cao (cm)</th>
                    <th style={{ width: 130 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={5} className="text-muted">Đang tải...</td></tr>
                  )}
                  {!isLoading && (cartonTypes?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="text-muted">Khách hàng này chưa có loại thùng nào.</td></tr>
                  )}
                  {cartonTypes?.map((ct) => (
                    <tr key={ct.id}>
                      {editingId === ct.id ? (
                        <>
                          <td>
                            <input className="form-control form-control-sm" value={editForm.label}
                              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
                          </td>
                          <td>
                            <input type="number" min={0} step={0.1} className="form-control form-control-sm" value={editForm.length}
                              onChange={(e) => setEditForm({ ...editForm, length: e.target.value })} />
                          </td>
                          <td>
                            <input type="number" min={0} step={0.1} className="form-control form-control-sm" value={editForm.width}
                              onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} />
                          </td>
                          <td>
                            <input type="number" min={0} step={0.1} className="form-control form-control-sm" value={editForm.height}
                              onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} />
                          </td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-success me-2" onClick={() => saveEdit(ct.id)} disabled={updateMutation.isPending}>
                              Lưu
                            </button>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                              Hủy
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{ct.label}</td>
                          <td>{(Number(ct.length) * CM_PER_M).toFixed(1)}</td>
                          <td>{(Number(ct.width) * CM_PER_M).toFixed(1)}</td>
                          <td>{(Number(ct.height) * CM_PER_M).toFixed(1)}</td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(ct)}>
                              <i className="fe fe-edit-2"></i>
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(ct)}>
                              <i className="fe fe-trash-2"></i>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h6 className="mb-3">Thêm loại thùng mới</h6>
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label small">Tên thùng</label>
                <input className="form-control" placeholder="Ví dụ: Thùng áo thun"
                  value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Dài (cm)</label>
                <input type="number" min={0} step={0.1} className="form-control" value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Rộng (cm)</label>
                <input type="number" min={0} step={0.1} className="form-control" value={form.width}
                  onChange={(e) => setForm({ ...form, width: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Cao (cm)</label>
                <input type="number" min={0} step={0.1} className="form-control" value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-primary w-100" onClick={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa loại thùng"
        description={`Xóa loại thùng "${deleteTarget?.label}" khỏi danh mục? Hành động này không thể hoàn tác.`}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
