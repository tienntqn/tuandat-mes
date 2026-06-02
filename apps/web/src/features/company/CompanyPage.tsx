import { useState } from 'react'
import { useCompany, useUpdateCompany } from './company.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { UpdateCompanyDto } from './company.api'
import { useAuthStore } from '@/stores/auth.store'

export default function CompanyPage() {
  const { data, isLoading } = useCompany()
  const updateCompany = useUpdateCompany()
  const { isAdmin } = useAuthStore()
  const canEdit = isAdmin()

  const [form, setForm] = useState<UpdateCompanyDto>({})
  const [editing, setEditing] = useState(false)

  const startEdit = () => {
    if (!data) return
    setForm({
      name: data.name,
      taxCode: data.taxCode ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      logo: data.logo ?? '',
    })
    setEditing(true)
  }

  const handleSave = () => {
    updateCompany.mutate(form, { onSuccess: () => setEditing(false) })
  }

  if (isLoading) {
    return (
      <div className="main-container container-fluid">
        <div className="text-center py-5 text-muted">Đang tải...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="main-container container-fluid">
        <div className="text-center py-5 text-muted">Chưa có dữ liệu công ty</div>
      </div>
    )
  }

  return (
    <PageWrapper
      title="Thông tin Công ty"
      breadcrumbs={[{ label: 'Dữ liệu nền' }, { label: 'Công ty' }]}
      actions={
        canEdit && !editing ? (
          <button onClick={startEdit} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-edit-2"></i></span> Chỉnh sửa
          </button>
        ) : undefined
      }
    >
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fe fe-briefcase me-2 text-primary"></i>
                {data.name}
              </h3>
            </div>
            <div className="card-body">
              {editing ? (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tên công ty <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      value={form.name ?? ''}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mã số thuế</label>
                    <input
                      className="form-control"
                      value={form.taxCode ?? ''}
                      onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Số điện thoại</label>
                    <input
                      className="form-control"
                      value={form.phone ?? ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email ?? ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Địa chỉ</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address ?? ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button onClick={() => setEditing(false)} className="btn btn-outline-secondary">
                      Hủy
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!form.name || updateCompany.isPending}
                      className="btn btn-primary text-white"
                    >
                      <i className="fe fe-save me-1"></i>
                      {updateCompany.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </>
              ) : (
                <table className="table table-borderless mb-0">
                  <tbody>
                    <InfoRow label="Tên công ty" value={data.name} />
                    <InfoRow label="Mã số thuế" value={data.taxCode} />
                    <InfoRow label="Số điện thoại" value={data.phone} />
                    <InfoRow label="Email" value={data.email} />
                    <InfoRow label="Địa chỉ" value={data.address} />
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr>
      <td className="text-muted fw-semibold" style={{ width: '35%' }}>{label}</td>
      <td className="fw-medium">
        {value || <span className="text-muted fst-italic">Chưa cập nhật</span>}
      </td>
    </tr>
  )
}
