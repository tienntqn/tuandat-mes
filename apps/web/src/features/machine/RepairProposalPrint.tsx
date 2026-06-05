import { X, Printer } from 'lucide-react'
import { useRepairProposal } from './repair.hooks'
import { REPAIR_TYPE_LABELS, REPAIR_STATUS_LABELS } from './repair.api'

interface Props {
  open: boolean
  proposalId: number | null
  onClose: () => void
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

// Phiếu in đề xuất sửa chữa/thay thế — mirror PackingListDialog.
export function RepairProposalPrint({ open, proposalId, onClose }: Props) {
  const { data: p } = useRepairProposal(proposalId ?? 0)

  if (!open || !proposalId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10 no-print">
          <h2 className="font-bold text-lg">Phiếu đề xuất {p?.proposalNo ?? ''}</h2>
          <div className="d-flex gap-2 align-items-center">
            <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"><Printer size={14} /> In / PDF</button>
            <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </div>

        {!p ? (
          <div className="p-5 text-center text-muted">Đang tải...</div>
        ) : (
          <div className="p-5 repair-print">
            <div className="text-center mb-3">
              <div className="fw-bold text-uppercase" style={{ fontSize: 18 }}>Phiếu đề xuất {REPAIR_TYPE_LABELS[p.type]}</div>
              <div className="text-muted">Số: {p.proposalNo} · Ngày: {fmtDate(p.createdAt)}</div>
            </div>

            <table className="table table-sm table-bordered mb-3">
              <tbody>
                <tr><td style={{ width: 140 }} className="fw-medium">Máy</td><td>{p.machine?.code} — {p.machine?.name}</td></tr>
                <tr><td className="fw-medium">Xưởng</td><td>{p.factory?.name}</td></tr>
                <tr><td className="fw-medium">Tiêu đề</td><td>{p.title}</td></tr>
                <tr><td className="fw-medium">Tình trạng</td><td>{p.description ?? '—'}</td></tr>
                <tr><td className="fw-medium">Trạng thái</td><td>{REPAIR_STATUS_LABELS[p.status]}</td></tr>
                {p.estimatedCost != null && <tr><td className="fw-medium">Chi phí dự kiến</td><td>{Number(p.estimatedCost).toLocaleString('vi-VN')} đ</td></tr>}
              </tbody>
            </table>

            <div className="fw-medium mb-1">Danh sách phụ tùng / hạng mục</div>
            <table className="table table-sm table-bordered mb-3">
              <thead><tr><th style={{ width: 36 }}>#</th><th>Tên</th><th style={{ width: 64 }}>SL</th><th style={{ width: 64 }}>ĐV</th><th>Ghi chú</th></tr></thead>
              <tbody>
                {(p.items ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted">Không có</td></tr>
                ) : p.items!.map((it, i) => (
                  <tr key={it.id}><td>{i + 1}</td><td>{it.name}</td><td>{it.quantity}</td><td>{it.unit ?? '—'}</td><td>{it.note ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>

            {p.attachments && p.attachments.filter((a) => a.type === 'IMAGE').length > 0 && (
              <>
                <div className="fw-medium mb-1">Hình ảnh đính kèm</div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {p.attachments.filter((a) => a.type === 'IMAGE').map((a) => (
                    <img key={a.id} src={a.url} alt="" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 6 }} className="border" />
                  ))}
                </div>
              </>
            )}
            {p.attachments && p.attachments.some((a) => a.type === 'VIDEO') && (
              <div className="text-muted small mb-3 no-print">(Có {p.attachments.filter((a) => a.type === 'VIDEO').length} video đính kèm — xem trên hệ thống)</div>
            )}

            <div className="d-flex justify-content-between mt-4 text-center">
              <div style={{ width: '45%' }}><div className="fw-medium">Người đề xuất</div><div className="text-muted small">(Ký, ghi rõ họ tên)</div><div style={{ height: 60 }} /></div>
              <div style={{ width: '45%' }}><div className="fw-medium">Giám đốc xưởng duyệt</div><div className="text-muted small">(Ký, ghi rõ họ tên)</div><div style={{ height: 60 }} /></div>
            </div>
          </div>
        )}
      </div>

      <style>{`@media print { body * { visibility: hidden; } .repair-print, .repair-print * { visibility: visible; } .repair-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; } .no-print { display: none !important; } }`}</style>
    </div>
  )
}
