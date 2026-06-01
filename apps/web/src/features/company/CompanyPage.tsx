import { useState } from 'react'
import { Building2, Save } from 'lucide-react'
import { useCompany, useUpdateCompany } from './company.hooks'
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
      <div className="p-6 text-center text-muted-foreground">Đang tải...</div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-muted-foreground">Chưa có dữ liệu công ty</div>
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Thông tin Công ty</h1>
            <p className="text-sm text-muted-foreground">Cài đặt thông tin doanh nghiệp</p>
          </div>
        </div>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        {editing ? (
          <>
            <Field label="Tên công ty *">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Mã số thuế">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.taxCode ?? ''}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Địa chỉ">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || updateCompany.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {updateCompany.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </>
        ) : (
          <>
            <InfoRow label="Tên công ty" value={data.name} />
            <InfoRow label="Mã số thuế" value={data.taxCode} />
            <InfoRow label="Số điện thoại" value={data.phone} />
            <InfoRow label="Email" value={data.email} />
            <InfoRow label="Địa chỉ" value={data.address} />
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-4 py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</span>
    </div>
  )
}
