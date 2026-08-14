import { DocumentPrintFrame } from './DocumentPrintFrame'
import { WORK_TYPE_LABELS, WORK_ORDER_STATUS_LABELS, type WorkOrder } from './work-order.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')
const fmtMoney = (v?: number | null) => (v != null ? `${Number(v).toLocaleString('vi-VN')} đ` : '—')

/** Bản in A4 của phiếu sửa chữa / phiếu bảo dưỡng MMTB. */
export function WorkOrderPrint({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  const o = order
  const parts = o.parts ?? []
  const partsTotal = parts.reduce((sum, p) => sum + (p.amount != null ? Number(p.amount) : 0), 0)

  return (
    <DocumentPrintFrame
      title={`Phiếu ${WORK_TYPE_LABELS[o.type].toLowerCase()} máy móc thiết bị`}
      documentNo={o.orderNo}
      documentDate={o.finishedAt ?? o.startedAt ?? o.createdAt}
      onClose={onClose}
      signatures={[{ label: 'Người thực hiện' }, { label: 'Bộ phận sử dụng' }, { label: 'Giám đốc xưởng' }]}
    >
      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Mã máy</td><td>{o.machine?.code ?? '—'}</td></tr>
          <tr><td className="fw-medium">Tên máy</td><td>{o.machine?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Model / Serial</td><td>{[o.machine?.model, o.machine?.serialNo].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td className="fw-medium">Xưởng / Chuyền</td><td>{[o.factory?.name, o.machine?.line?.name].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td className="fw-medium">Căn cứ</td><td>
            {o.breakdownReport ? `Phiếu báo hỏng ${o.breakdownReport.reportNo}` : ''}
            {o.maintenanceRequest ? `Phiếu yêu cầu ${o.maintenanceRequest.requestNo}` : ''}
            {o.planItem ? `Kế hoạch ${o.planItem.plan.planNo}` : ''}
            {!o.breakdownReport && !o.maintenanceRequest && !o.planItem ? 'Phát sinh trực tiếp' : ''}
          </td></tr>
          <tr><td className="fw-medium">Thời gian thực hiện</td><td>{fmtDate(o.startedAt)} → {fmtDate(o.finishedAt)}</td></tr>
          <tr><td className="fw-medium">Số giờ máy dừng</td><td>{o.downtimeHours != null ? `${Number(o.downtimeHours)} giờ` : '—'}</td></tr>
          <tr><td className="fw-medium">Trạng thái</td><td>{WORK_ORDER_STATUS_LABELS[o.status]}</td></tr>
        </tbody>
      </table>

      <div className="mb-3">
        <div className="fw-medium mb-1">Nội dung công việc</div>
        <div className="border rounded p-2 small" style={{ minHeight: 50 }}>{o.content}</div>
      </div>

      {o.findings && (
        <div className="mb-3">
          <div className="fw-medium mb-1">Tình trạng phát hiện</div>
          <div className="border rounded p-2 small">{o.findings}</div>
        </div>
      )}

      <div className="fw-medium mb-1">Vật tư, phụ tùng sử dụng</div>
      <table className="table table-sm table-bordered mb-3">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th><th>Tên vật tư</th>
            <th style={{ width: 70 }}>SL</th><th style={{ width: 60 }}>ĐVT</th>
            <th style={{ width: 100 }}>Đơn giá</th><th style={{ width: 110 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-muted">Không sử dụng vật tư</td></tr>
          ) : parts.map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td className="text-end">{Number(p.quantity)}</td>
              <td>{p.unit ?? '—'}</td>
              <td className="text-end">{p.unitPrice != null ? Number(p.unitPrice).toLocaleString('vi-VN') : '—'}</td>
              <td className="text-end">{p.amount != null ? Number(p.amount).toLocaleString('vi-VN') : '—'}</td>
            </tr>
          ))}
          {parts.length > 0 && (
            <tr>
              <td colSpan={5} className="text-end fw-medium">Cộng tiền vật tư</td>
              <td className="text-end fw-medium">{partsTotal.toLocaleString('vi-VN')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Chi phí vật tư</td><td>{fmtMoney(o.partsCost)}</td></tr>
          <tr><td className="fw-medium">Chi phí nhân công</td><td>{fmtMoney(o.laborCost)}</td></tr>
          <tr><td className="fw-medium">Tổng chi phí</td><td className="fw-bold">{fmtMoney(o.totalCost)}</td></tr>
          {o.nextDueDate && <tr><td className="fw-medium">Hạn bảo dưỡng kế tiếp</td><td>{fmtDate(o.nextDueDate)}</td></tr>}
        </tbody>
      </table>

      <div className="mb-3">
        <div className="fw-medium mb-1">Kết quả thực hiện</div>
        <div className="border rounded p-2 small" style={{ minHeight: 60 }}>{o.result ?? ''}</div>
      </div>
    </DocumentPrintFrame>
  )
}
