import { DocumentPrintFrame } from './DocumentPrintFrame'
import { WORK_TYPE_LABELS } from './work-order.api'
import { PART_REQUEST_STATUS_LABELS, type PartRequest } from './part-request.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Bản in A4 của yêu cầu mua vật tư sửa chữa / bảo dưỡng. */
export function PartRequestPrint({ request, onClose }: { request: PartRequest; onClose: () => void }) {
  const r = request
  const items = r.items ?? []
  const total = items.reduce((sum, i) => sum + (i.amount != null ? Number(i.amount) : 0), 0)

  return (
    <DocumentPrintFrame
      title={`Yêu cầu mua vật tư ${WORK_TYPE_LABELS[r.type].toLowerCase()}`}
      documentNo={r.requestNo}
      documentDate={r.requestDate}
      onClose={onClose}
      signatures={[
        { label: 'Người đề nghị' },
        { label: 'Giám đốc xưởng duyệt' },
        { label: 'Công ty phê duyệt' },
      ]}
    >
      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Nội dung</td><td>{r.title}</td></tr>
          <tr><td className="fw-medium">Xưởng</td><td>{r.factory?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Ngày yêu cầu</td><td>{fmtDate(r.requestDate)}</td></tr>
          <tr><td className="fw-medium">Ngày cần có</td><td>{fmtDate(r.neededDate)}</td></tr>
          <tr><td className="fw-medium">Căn cứ</td><td>
            {r.workPlan ? `Kế hoạch ${r.workPlan.planNo} — ${r.workPlan.title}` : ''}
            {r.workOrder ? `Phiếu ${r.workOrder.orderNo}` : ''}
            {r.breakdownReport ? `Phiếu báo hỏng ${r.breakdownReport.reportNo}` : ''}
            {!r.workPlan && !r.workOrder && !r.breakdownReport ? 'Phát sinh trực tiếp' : ''}
          </td></tr>
          <tr><td className="fw-medium">Trạng thái</td><td>{PART_REQUEST_STATUS_LABELS[r.status]}</td></tr>
          {r.reason && <tr><td className="fw-medium">Lý do</td><td>{r.reason}</td></tr>}
        </tbody>
      </table>

      <div className="fw-medium mb-1">Danh sách vật tư đề nghị mua</div>
      <table className="table table-sm table-bordered mb-3">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th><th style={{ width: 90 }}>Mã</th><th>Tên vật tư</th>
            <th style={{ width: 60 }}>ĐVT</th><th style={{ width: 70 }}>SL</th>
            <th style={{ width: 70 }}>Tồn</th><th style={{ width: 100 }}>Đơn giá</th><th style={{ width: 110 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-muted">Không có vật tư</td></tr>
          ) : items.map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td>
              <td>{it.sparePart?.code ?? '—'}</td>
              <td>{it.name}</td>
              <td>{it.unit ?? '—'}</td>
              <td className="text-end">{Number(it.quantity)}</td>
              <td className="text-end">{it.stockQuantity != null ? Number(it.stockQuantity) : '—'}</td>
              <td className="text-end">{it.estimatedPrice != null ? Number(it.estimatedPrice).toLocaleString('vi-VN') : '—'}</td>
              <td className="text-end">{it.amount != null ? Number(it.amount).toLocaleString('vi-VN') : '—'}</td>
            </tr>
          ))}
          {items.length > 0 && (
            <tr>
              <td colSpan={7} className="text-end fw-medium">Tổng cộng</td>
              <td className="text-end fw-bold">{total.toLocaleString('vi-VN')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="small mb-3">
        Cột "Tồn" là số lượng còn trong kho xưởng tại thời điểm lập yêu cầu.
      </div>
    </DocumentPrintFrame>
  )
}
