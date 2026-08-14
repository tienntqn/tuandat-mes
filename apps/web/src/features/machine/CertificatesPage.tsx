import { useState, useEffect } from 'react'
import { X, AlertTriangle, Paperclip } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCertificates, useCreateCertificate, useUpdateCertificate, useDeleteCertificate } from './mmtb.hooks'
import { machineApi } from './machine.api'
import {
  CERTIFICATE_TYPE_LABELS,
  type MachineCertificate,
  type CreateCertificateDto,
  type CertificateType,
} from './mmtb.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { uploadApi } from '@/lib/upload'
import { toast } from '@/lib/toast'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Số ngày còn lại tới hạn; âm nghĩa là đã quá hạn. */
const daysLeft = (expiry?: string | null) =>
  expiry ? Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000) : null

export default function CertificatesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MachineCertificate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MachineCertificate | null>(null)
  const [onlyExpiring, setOnlyExpiring] = useState(false)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data: certs = [], isLoading, refetch } = useCertificates(onlyExpiring ? { expiringInDays: 60 } : undefined)
  const createCert = useCreateCertificate()
  const updateCert = useUpdateCertificate()
  const deleteCert = useDeleteCertificate()

  const expiringCount = certs.filter((c) => {
    const d = daysLeft(c.expiryDate)
    return d !== null && d <= 30
  }).length

  const handleSubmit = (dto: CreateCertificateDto) => {
    if (editTarget) updateCert.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    else createCert.mutate(dto, { onSuccess: () => setFormOpen(false) })
  }

  return (
    <PageWrapper
      title="Chứng chỉ & Kiểm định"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Chứng chỉ, kiểm định' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm chứng chỉ
            </button>
          )}
        </div>
      }
    >
      {expiringCount > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> Có <strong>{expiringCount}</strong> chứng chỉ sắp hết hạn hoặc đã quá hạn trong 30 ngày.
        </div>
      )}

      <div className="row mb-3">
        <div className="col-auto d-flex align-items-center gap-3">
          <div className="form-check mb-0">
            <input className="form-check-input" type="checkbox" id="onlyExpiring" checked={onlyExpiring} onChange={(e) => setOnlyExpiring(e.target.checked)} />
            <label className="form-check-label small" htmlFor="onlyExpiring">Chỉ hiện sắp hết hạn (60 ngày)</label>
          </div>
          <small className="text-muted">{certs.length} chứng chỉ</small>
        </div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Máy</th><th>Tên chứng chỉ</th><th>Loại</th><th>Số hiệu</th>
              <th>Đơn vị cấp</th><th className="text-center">Ngày cấp</th>
              <th className="text-center">Hết hạn</th><th className="text-center">File</th>
              {canWrite && <th className="text-end">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : certs.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-4 text-muted">Chưa có chứng chỉ nào</td></tr>
            ) : (
              certs.map((c) => {
                const left = daysLeft(c.expiryDate)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-medium">{c.machine?.code}</div>
                      <div className="small text-muted">{c.machine?.name}</div>
                    </td>
                    <td className="fw-medium">{c.name}</td>
                    <td className="small text-muted">{CERTIFICATE_TYPE_LABELS[c.type]}</td>
                    <td className="small">{c.certNo ?? '—'}</td>
                    <td className="small text-muted">{c.issuedBy ?? '—'}</td>
                    <td className="text-center small">{fmtDate(c.issueDate)}</td>
                    <td className="text-center small">
                      {fmtDate(c.expiryDate)}
                      {left !== null && left < 0 && <div><span className="badge bg-danger-transparent">Quá hạn {-left} ngày</span></div>}
                      {left !== null && left >= 0 && left <= 30 && <div><span className="badge bg-warning-transparent">Còn {left} ngày</span></div>}
                    </td>
                    <td className="text-center">
                      {c.fileUrl
                        ? <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><Paperclip size={13} /></a>
                        : <span className="text-muted">—</span>}
                    </td>
                    {canWrite && (
                      <td className="text-end"><div className="d-flex justify-content-end gap-1">
                        <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                        <button onClick={() => setDeleteTarget(c)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                      </div></td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div></div></div>

      <CertificateFormDialog
        open={formOpen}
        cert={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createCert.isPending || updateCert.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa chứng chỉ"
        description={`Xóa chứng chỉ "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteCert.isPending}
        onConfirm={() => deleteTarget && deleteCert.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}

function CertificateFormDialog({
  open, cert, onClose, onSubmit, isPending,
}: {
  open: boolean
  cert?: MachineCertificate | null
  onClose: () => void
  onSubmit: (dto: CreateCertificateDto) => void
  isPending?: boolean
}) {
  const [form, setForm] = useState<CreateCertificateDto>({ machineId: 0, name: '', type: 'INSPECTION' })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: machines } = useQuery({
    queryKey: ['machines-for-cert'],
    queryFn: () => machineApi.list({ pageSize: 500 }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(cert
      ? {
          machineId: cert.machineId,
          type: cert.type,
          certNo: cert.certNo ?? '',
          name: cert.name,
          issuedBy: cert.issuedBy ?? '',
          issueDate: cert.issueDate?.slice(0, 10) ?? '',
          expiryDate: cert.expiryDate?.slice(0, 10) ?? '',
          fileUrl: cert.fileUrl ?? '',
          note: cert.note ?? '',
        }
      : { machineId: 0, name: '', type: 'INSPECTION' })
  }, [open, cert])

  if (!open) return null

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadApi.uploadDocument(file)
      setForm((f) => ({ ...f, fileUrl: res.url }))
      toast.success('Đã tải file lên')
    } catch {
      toast.error('Tải file thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{cert ? 'Cập nhật chứng chỉ' : 'Thêm chứng chỉ / kiểm định'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.machineId) { setError('Phải chọn máy'); return }
            if (!form.name.trim()) { setError('Tên chứng chỉ không được để trống'); return }
            onSubmit({
              ...form,
              certNo: form.certNo?.trim() || undefined,
              issuedBy: form.issuedBy?.trim() || undefined,
              issueDate: form.issueDate || undefined,
              expiryDate: form.expiryDate || undefined,
              fileUrl: form.fileUrl || undefined,
              note: form.note?.trim() || undefined,
            })
          }}
          className="p-5 space-y-3"
        >
          <div>
            <label className="text-sm font-medium mb-1 block">Máy *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.machineId || ''} onChange={(e) => setForm({ ...form, machineId: Number(e.target.value) })} disabled={!!cert}>
              <option value="">— Chọn máy —</option>
              {machines?.data.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Loại</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.type ?? 'INSPECTION'} onChange={(e) => setForm({ ...form, type: e.target.value as CertificateType })}>
                {(Object.keys(CERTIFICATE_TYPE_LABELS) as CertificateType[]).map((t) => (
                  <option key={t} value={t}>{CERTIFICATE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Số hiệu</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.certNo ?? ''} onChange={(e) => setForm({ ...form, certNo: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tên chứng chỉ *</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Kiểm định an toàn nồi hơi" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Đơn vị cấp</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.issuedBy ?? ''} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} />
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Ngày cấp</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.issueDate ?? ''} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Ngày hết hạn</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.expiryDate ?? ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">File chứng chỉ (PDF/ảnh)</label>
            <input type="file" className="form-control form-control-sm" accept="image/*,application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} disabled={uploading} />
            {uploading && <p className="text-xs text-muted mt-1">Đang tải lên...</p>}
            {form.fileUrl && <a href={form.fileUrl} target="_blank" rel="noreferrer" className="text-xs d-inline-block mt-1">Xem file đã tải</a>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending || uploading} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : cert ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
