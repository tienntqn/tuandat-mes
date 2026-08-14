import { DocumentPrintFrame } from './DocumentPrintFrame'
import { SEVERITY_LABELS, BREAKDOWN_STATUS_LABELS, type BreakdownReport } from './breakdown.api'

const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('vi-VN') : '—')

/** Bản in A4 của phiếu báo hỏng máy móc thiết bị. */
export function BreakdownPrint({ report, onClose }: { report: BreakdownReport; onClose: () => void }) {
  const b = report
  return (
    <DocumentPrintFrame
      title="Phiếu báo hỏng máy móc thiết bị"
      documentNo={b.reportNo}
      documentDate={b.reportedAt}
      onClose={onClose}
      signatures={[{ label: 'Người báo hỏng' }, { label: 'Tổ cơ điện tiếp nhận' }, { label: 'Giám đốc xưởng' }]}
    >
      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Mã máy</td><td>{b.machine?.code ?? '—'}</td></tr>
          <tr><td className="fw-medium">Tên máy</td><td>{b.machine?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Model / Serial</td><td>{[b.machine?.model, b.machine?.serialNo].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td className="fw-medium">Xưởng</td><td>{b.factory?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Chuyền</td><td>{b.line?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Thời điểm báo hỏng</td><td>{fmtDateTime(b.reportedAt)}</td></tr>
          <tr><td className="fw-medium">Mức độ</td><td>{SEVERITY_LABELS[b.severity]}</td></tr>
          <tr><td className="fw-medium">Ảnh hưởng sản xuất</td><td>{b.stoppedProduction ? 'Có — máy dừng sản xuất' : 'Không'}</td></tr>
          <tr><td className="fw-medium">Trạng thái xử lý</td><td>{BREAKDOWN_STATUS_LABELS[b.status]}</td></tr>
        </tbody>
      </table>

      <div className="mb-3">
        <div className="fw-medium mb-1">Hiện tượng hỏng</div>
        <div className="border rounded p-2 small" style={{ minHeight: 60 }}>{b.symptom}</div>
      </div>

      {b.note && (
        <div className="mb-3">
          <div className="fw-medium mb-1">Ghi chú</div>
          <div className="border rounded p-2 small">{b.note}</div>
        </div>
      )}

      {b.imageUrls?.length > 0 && (
        <div className="mb-3">
          <div className="fw-medium mb-1">Ảnh hiện trạng</div>
          <div className="d-flex flex-wrap gap-2">
            {b.imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 6 }} className="border" />
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="fw-medium mb-1">Ý kiến xử lý của tổ cơ điện</div>
        <div className="border rounded p-2" style={{ minHeight: 70 }} />
      </div>
    </DocumentPrintFrame>
  )
}
