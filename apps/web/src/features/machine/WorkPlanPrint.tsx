import { DocumentPrintFrame } from './DocumentPrintFrame'
import { WORK_TYPE_LABELS } from './work-order.api'
import { PLAN_STATUS_LABELS, type WorkPlan } from './maintenance-plan.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Bản in A4 của kế hoạch sửa chữa / bảo dưỡng máy móc thiết bị. */
export function WorkPlanPrint({ plan, onClose }: { plan: WorkPlan; onClose: () => void }) {
  const items = plan.items ?? []
  const total = items.reduce((sum, i) => sum + (i.estimatedCost != null ? Number(i.estimatedCost) : 0), 0)

  return (
    <DocumentPrintFrame
      title={`Kế hoạch ${WORK_TYPE_LABELS[plan.type].toLowerCase()} máy móc thiết bị`}
      documentNo={plan.planNo}
      documentDate={plan.createdAt}
      onClose={onClose}
      signatures={[
        { label: 'Người lập kế hoạch' },
        { label: 'Giám đốc xưởng duyệt' },
        { label: 'Công ty phê duyệt' },
      ]}
    >
      <table className="table table-sm table-bordered mb-3">
        <tbody>
          <tr><td style={{ width: 170 }} className="fw-medium">Tên kế hoạch</td><td>{plan.title}</td></tr>
          <tr><td className="fw-medium">Xưởng</td><td>{plan.factory?.name ?? '—'}</td></tr>
          <tr><td className="fw-medium">Thời gian</td><td>{fmtDate(plan.periodFrom)} → {fmtDate(plan.periodTo)}</td></tr>
          <tr><td className="fw-medium">Trạng thái</td><td>{PLAN_STATUS_LABELS[plan.status]}</td></tr>
          {plan.note && <tr><td className="fw-medium">Ghi chú</td><td>{plan.note}</td></tr>}
        </tbody>
      </table>

      <div className="fw-medium mb-1">Danh sách công việc</div>
      <table className="table table-sm table-bordered mb-3">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th><th style={{ width: 110 }}>Mã máy</th><th>Tên máy</th>
            <th>Nội dung công việc</th><th style={{ width: 90 }}>Ngày</th><th style={{ width: 110 }}>Chi phí DK</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-muted">Chưa có công việc</td></tr>
          ) : items.map((i, idx) => (
            <tr key={i.id}>
              <td>{idx + 1}</td>
              <td>{i.machine?.code ?? '—'}</td>
              <td>{i.machine?.name ?? '—'}</td>
              <td>{i.content}</td>
              <td>{fmtDate(i.plannedDate)}</td>
              <td className="text-end">{i.estimatedCost != null ? Number(i.estimatedCost).toLocaleString('vi-VN') : '—'}</td>
            </tr>
          ))}
          {items.length > 0 && (
            <tr>
              <td colSpan={5} className="text-end fw-medium">Tổng chi phí dự kiến</td>
              <td className="text-end fw-bold">{total.toLocaleString('vi-VN')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </DocumentPrintFrame>
  )
}
