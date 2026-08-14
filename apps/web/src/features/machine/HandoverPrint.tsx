import { DocumentPrintFrame } from './DocumentPrintFrame'
import { HANDOVER_TYPE_LABELS, type MachineHandover } from './mmtb.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/** Bản in A4 của biên bản bàn giao máy (nhận máy / sau sửa chữa / sau bảo dưỡng). */
export function HandoverPrint({ handover, onClose }: { handover: MachineHandover; onClose: () => void }) {
  const h = handover
  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ width: 170 }} className="fw-medium">{label}</td>
      <td>{value ?? '—'}</td>
    </tr>
  )

  return (
    <DocumentPrintFrame
      title={HANDOVER_TYPE_LABELS[h.type]}
      documentNo={h.handoverNo}
      documentDate={h.handoverDate}
      onClose={onClose}
      signatures={[
        { label: 'Bên giao' },
        { label: 'Bên nhận' },
        { label: 'Giám đốc xưởng' },
      ]}
    >
      <div className="small mb-2">
        Hôm nay, ngày {fmtDate(h.handoverDate)}, tại {h.factory?.name ?? 'xưởng sản xuất'}, chúng tôi gồm các bên
        tiến hành bàn giao máy móc thiết bị với nội dung như sau:
      </div>

      <table className="table table-sm table-bordered mb-3">
        <tbody>
          {row('Mã máy', h.machine?.code)}
          {row('Tên máy', h.machine?.name)}
          {row('Hãng sản xuất', h.machine?.brandRef?.name)}
          {row('Chủng loại', h.machine?.category?.name)}
          {row('Model', h.machine?.model)}
          {row('Số serial', h.machine?.serialNo)}
          {row('Xưởng', h.factory?.name)}
          {row('Chuyền tiếp nhận', h.line?.name)}
          {h.type === 'RECEIVE' && row('Bên giao', h.fromParty)}
          {h.workOrder && row('Theo phiếu', `${h.workOrder.orderNo} — ${h.workOrder.content}`)}
          {row('Tình trạng máy', h.condition)}
          {row('Phụ kiện kèm theo', h.accessories)}
          {row('Ghi chú', h.note)}
        </tbody>
      </table>

      {h.workOrder?.result && (
        <div className="mb-3">
          <div className="fw-medium mb-1">Kết quả thực hiện</div>
          <div className="border rounded p-2 small">{h.workOrder.result}</div>
        </div>
      )}

      <div className="small mb-3">
        Hai bên đã cùng kiểm tra tình trạng thiết bị và thống nhất nội dung nêu trên.
        Biên bản được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.
      </div>
    </DocumentPrintFrame>
  )
}
