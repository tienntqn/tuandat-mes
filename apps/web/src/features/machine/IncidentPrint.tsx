import { DocumentPrintFrame } from './DocumentPrintFrame'
import type { IncidentReport } from './breakdown.api'

const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('vi-VN') : '—')

/** Bản in A4 của biên bản sự cố máy móc thiết bị. */
export function IncidentPrint({ incident, onClose }: { incident: IncidentReport; onClose: () => void }) {
  const c = incident
  const block = (label: string, value?: string | null, minHeight = 50) => (
    <div className="mb-3">
      <div className="fw-medium mb-1">{label}</div>
      <div className="border rounded p-2 small" style={{ minHeight }}>{value || ''}</div>
    </div>
  )

  return (
    <DocumentPrintFrame
      title="Biên bản sự cố máy móc thiết bị"
      documentNo={c.incidentNo}
      documentDate={c.incidentDate}
      onClose={onClose}
      signatures={[{ label: 'Người lập biên bản' }, { label: 'Tổ trưởng đơn vị' }, { label: 'Giám đốc xưởng' }]}
    >
      <div className="small mb-2">
        Hôm nay, vào lúc {fmtDateTime(c.incidentDate)}, tại {c.factory?.name ?? 'xưởng sản xuất'},
        chúng tôi tiến hành lập biên bản ghi nhận sự cố máy móc thiết bị như sau:
      </div>

      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Mã máy</td><td>{c.machine?.code ?? '—'}</td></tr>
          <tr><td className="fw-medium">Tên máy</td><td>{c.machine?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Model / Serial</td><td>{[c.machine?.model, c.machine?.serialNo].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td className="fw-medium">Phiếu báo hỏng</td><td>{c.breakdownReport?.reportNo ?? '—'}</td></tr>
          <tr><td className="fw-medium">Số giờ dừng máy</td><td>{c.downtimeHours != null ? `${Number(c.downtimeHours)} giờ` : '—'}</td></tr>
          <tr><td className="fw-medium">Thiệt hại ước tính</td><td>{c.damageValue != null ? `${Number(c.damageValue).toLocaleString('vi-VN')} đ` : '—'}</td></tr>
          <tr><td className="fw-medium">Bên chịu trách nhiệm</td><td>{c.responsibleParty ?? '—'}</td></tr>
        </tbody>
      </table>

      {block('Diễn biến sự cố', c.description, 70)}
      {block('Nguyên nhân', c.cause)}
      {block('Hậu quả', c.consequence)}
      {block('Biện pháp khắc phục, phòng ngừa', c.preventiveAction)}

      {c.witnesses && (
        <div className="mb-3 small">
          <span className="fw-medium">Thành phần tham gia: </span>{c.witnesses}
        </div>
      )}

      {c.imageUrls?.length > 0 && (
        <div className="mb-3">
          <div className="fw-medium mb-1">Ảnh hiện trường</div>
          <div className="d-flex flex-wrap gap-2">
            {c.imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 6 }} className="border" />
            ))}
          </div>
        </div>
      )}

      <div className="small mb-3">
        Biên bản được lập thành 02 bản, các bên cùng ký xác nhận và mỗi bên giữ 01 bản.
      </div>
    </DocumentPrintFrame>
  )
}
