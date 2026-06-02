import { useState } from 'react'
import { useMachineTransferHistory, useMachines } from './machine.hooks'
import { TRANSFER_STATUS_LABELS, MACHINE_TYPE_LABELS } from './machine.api'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { TransferStatus } from './machine.api'

const STATUS_BADGE: Record<TransferStatus, string> = {
  PENDING: 'badge bg-secondary',
  SENDER_CONFIRMED: 'badge bg-warning text-dark',
  COMPLETED: 'badge bg-success',
  REJECTED: 'badge bg-danger',
}

const STATUS_DOT: Record<TransferStatus, string> = {
  PENDING: '#adb5bd',
  SENDER_CONFIRMED: '#ffc107',
  COMPLETED: '#28a745',
  REJECTED: '#dc3545',
}

export default function MachineHistoryPage() {
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)

  const { data: machinesData } = useMachines({ pageSize: 200 })
  const { data: history, isLoading } = useMachineTransferHistory(selectedMachineId ?? 0)

  const machineList = machinesData?.data ?? []
  const selectedMachine = machineList.find((m) => m.id === selectedMachineId)

  return (
    <PageWrapper
      title="Lịch sử di chuyển máy"
      breadcrumbs={[{ label: 'Máy móc' }, { label: 'Lịch sử di chuyển' }]}
    >
      {/* Chọn máy */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <label className="form-label mb-0 fw-semibold">Chọn máy:</label>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={selectedMachineId ?? ''}
                onChange={(e) => setSelectedMachineId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Chọn máy để xem lịch sử —</option>
                {machineList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} ({MACHINE_TYPE_LABELS[m.type]})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin máy được chọn */}
      {selectedMachine && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-6 col-md-3 mb-2">
                <small className="text-muted d-block">Mã máy</small>
                <strong><code>{selectedMachine.code}</code></strong>
              </div>
              <div className="col-6 col-md-3 mb-2">
                <small className="text-muted d-block">Tên máy</small>
                <strong>{selectedMachine.name}</strong>
              </div>
              <div className="col-6 col-md-3 mb-2">
                <small className="text-muted d-block">Xưởng hiện tại</small>
                <strong>{selectedMachine.factory?.name ?? '—'}</strong>
              </div>
              <div className="col-6 col-md-3 mb-2">
                <small className="text-muted d-block">Chuyền hiện tại</small>
                <strong>{selectedMachine.line ? `Chuyền ${selectedMachine.line.lineNumber}` : 'Chưa gán'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!selectedMachineId ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fe fe-clock" style={{ fontSize: 36, opacity: 0.3 }}></i>
            <p className="mt-2 mb-0">Chọn máy để xem timeline điều chuyển</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="card">
          <div className="card-body text-center py-4 text-muted">Đang tải...</div>
        </div>
      ) : !history?.length ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fe fe-git-commit" style={{ fontSize: 36, opacity: 0.3 }}></i>
            <p className="mt-2 mb-0">Máy này chưa có lịch sử điều chuyển</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Timeline điều chuyển ({history.length} lần)</h3>
          </div>
          <div className="card-body">
            {history.map((t, idx) => (
              <div key={t.id} className="d-flex gap-3 mb-4">
                {/* Dot + line */}
                <div className="d-flex flex-column align-items-center" style={{ minWidth: 20 }}>
                  <div
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: STATUS_DOT[t.status], marginTop: 4, flexShrink: 0,
                    }}
                  />
                  {idx < history.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#eaedf1', marginTop: 4 }} />
                  )}
                </div>
                {/* Content */}
                <div className="card flex-fill mb-0" style={{ border: '1px solid #eaedf1' }}>
                  <div className="card-body py-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="mb-0 fw-semibold">{t.transferOrderNo}</p>
                        <small className="text-muted">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</small>
                      </div>
                      <span className={STATUS_BADGE[t.status]}>{TRANSFER_STATUS_LABELS[t.status]}</span>
                    </div>
                    <p className="mb-1 text-sm">
                      <span className="text-muted">{t.fromFactory?.name}</span>
                      <i className="fe fe-arrow-right mx-2 text-muted"></i>
                      <strong>{t.toFactory?.name}</strong>
                    </p>
                    <p className="mb-2 text-muted fst-italic small">"{t.reason}"</p>
                    <div className="row g-2">
                      <div className="col-md-6"><small className="text-muted">Người gửi: {t.sender?.fullName ?? '—'}</small></div>
                      <div className="col-md-6"><small className="text-muted">Người nhận: {t.receiver?.fullName ?? '—'}</small></div>
                      {t.senderConfirmedAt && (
                        <div className="col-md-6"><small className="text-muted">Bên đưa XN: {new Date(t.senderConfirmedAt).toLocaleString('vi-VN')}</small></div>
                      )}
                      {t.receiverConfirmedAt && (
                        <div className="col-md-6"><small className="text-muted">Bên nhận XN: {new Date(t.receiverConfirmedAt).toLocaleString('vi-VN')}</small></div>
                      )}
                    </div>
                    {t.rejectReason && (
                      <p className="mt-2 mb-0 text-danger small">Lý do từ chối: {t.rejectReason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
