import { useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { useMachineDocuments, useCreateMachineDocument, useDeleteMachineDocument } from './mmtb.hooks'
import { DOCUMENT_TYPE_LABELS, type MachineDocumentType } from './mmtb.api'
import { uploadApi } from '@/lib/upload'
import { toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Khối "Tài liệu đính kèm" trong hồ sơ máy — hiển thị trong trang chi tiết máy. */
export function MachineDocumentsCard({ machineId, canWrite }: { machineId: number; canWrite: boolean }) {
  const { data: docs = [], isLoading } = useMachineDocuments(machineId)
  const createDoc = useCreateMachineDocument()
  const deleteDoc = useDeleteMachineDocument()

  const [uploading, setUploading] = useState(false)
  const [type, setType] = useState<MachineDocumentType>('MANUAL')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadApi.uploadDocument(file)
      createDoc.mutate({
        machineId,
        type,
        name: file.name.replace(/\.[^.]+$/, ''),
        url: res.url,
        filename: res.filename,
      })
    } catch {
      toast.error('Tải tài liệu thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="card-title mb-0">Tài liệu đính kèm</h6>
        {canWrite && (
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: 190 }} value={type} onChange={(e) => setType(e.target.value as MachineDocumentType)}>
              {(Object.keys(DOCUMENT_TYPE_LABELS) as MachineDocumentType[]).map((t) => (
                <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <label className="btn btn-sm btn-outline-primary mb-0 d-inline-flex align-items-center gap-1">
              <Upload size={14} /> {uploading ? 'Đang tải...' : 'Tải lên'}
              <input
                type="file"
                hidden
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                disabled={uploading}
                onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
              />
            </label>
          </div>
        )}
      </div>
      <div className="card-body p-0">
        {isLoading ? (
          <div className="text-center py-3 text-muted small">Đang tải...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-3 text-muted small">Chưa có tài liệu nào</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="thead-light">
                <tr><th>Tên tài liệu</th><th>Loại</th><th className="text-center">Ngày tải</th><th className="text-end"></th></tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <a href={d.url} target="_blank" rel="noreferrer" className="d-inline-flex align-items-center gap-1">
                        <FileText size={14} /> {d.name}
                      </a>
                      {d.filename && <div className="small text-muted">{d.filename}</div>}
                    </td>
                    <td className="small text-muted">{DOCUMENT_TYPE_LABELS[d.type]}</td>
                    <td className="text-center small">{fmtDate(d.createdAt)}</td>
                    <td className="text-end">
                      {canWrite && (
                        <button onClick={() => setDeleteId(d.id)} className="btn btn-sm btn-outline-danger px-2"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Xóa tài liệu"
        description="Xóa tài liệu này khỏi hồ sơ máy?"
        confirmLabel="Xóa"
        destructive
        isPending={deleteDoc.isPending}
        onConfirm={() => deleteId && deleteDoc.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
