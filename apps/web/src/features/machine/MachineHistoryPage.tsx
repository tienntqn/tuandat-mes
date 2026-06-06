import { useMemo, useState } from 'react'
import { useMachineTransferHistory, useMachines, useTransfers } from './machine.hooks'
import { TRANSFER_STATUS_LABELS, MACHINE_TYPE_LABELS } from './machine.api'
import type { MachineTransfer, TransferStatus } from './machine.api'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

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

type Tab = 'factory' | 'machine'
type Direction = '' | 'out' | 'in'

export default function MachineHistoryPage() {
  const { user, isAdmin, hasRole } = useAuthStore()
  // Người dùng cấp công ty (Admin/BOD) không gắn xưởng → không lọc theo hướng
  const isCompanyLevel = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')
  const myFactoryId = user?.factoryId ?? null

  const [tab, setTab] = useState<Tab>('factory')

  return (
    <PageWrapper
      title="Lịch sử di chuyển máy"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Lịch sử di chuyển' }]}
    >
      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'factory' ? 'active' : ''}`} onClick={() => setTab('factory')}>
            <i className="fe fe-home me-1"></i> Theo xưởng
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'machine' ? 'active' : ''}`} onClick={() => setTab('machine')}>
            <i className="fe fe-hard-drive me-1"></i> Theo máy
          </button>
        </li>
      </ul>

      {tab === 'factory' ? (
        <FactoryHistory myFactoryId={myFactoryId} isCompanyLevel={isCompanyLevel} />
      ) : (
        <MachineTimeline />
      )}
    </PageWrapper>
  )
}

// ===== Lịch sử chuyển đi / chuyển đến theo xưởng =====
function FactoryHistory({ myFactoryId, isCompanyLevel }: { myFactoryId: number | null; isCompanyLevel: boolean }) {
  const [direction, setDirection] = useState<Direction>('')
  const [status, setStatus] = useState<string>('')

  // API tự lọc theo data scope: Cơ điện/GĐ xưởng chỉ nhận lệnh của xưởng mình (đưa hoặc nhận)
  const { data, isLoading } = useTransfers({ status: status || undefined, pageSize: 200 } as any)
  const rows = data?.data ?? []

  // Hướng so với xưởng của mình (chỉ áp dụng cho user gắn xưởng)
  const directionOf = (t: MachineTransfer): 'out' | 'in' | null => {
    if (myFactoryId == null) return null
    if (t.fromFactoryId === myFactoryId) return 'out'
    if (t.toFactoryId === myFactoryId) return 'in'
    return null
  }

  const filtered = useMemo(() => {
    if (!direction || myFactoryId == null) return rows
    return rows.filter((t) => directionOf(t) === direction)
  }, [rows, direction, myFactoryId])

  return (
    <>
      {/* Bộ lọc */}
      <div className="row g-2 mb-3">
        {myFactoryId != null && (
          <div className="col-auto">
            <select className="form-select" value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              <option value="">Tất cả chiều</option>
              <option value="out">Chuyển đi (xưởng mình gửi)</option>
              <option value="in">Chuyển đến (xưởng mình nhận)</option>
            </select>
          </div>
        )}
        <div className="col-auto">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {(Object.entries(TRANSFER_STATUS_LABELS) as [TransferStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Số lệnh</th>
                  <th>Máy</th>
                  <th>Từ xưởng</th>
                  <th>Đến xưởng</th>
                  {myFactoryId != null && <th>Chiều</th>}
                  <th>Ngày chuyển</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={myFactoryId != null ? 7 : 6} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={myFactoryId != null ? 7 : 6} className="text-center py-4 text-muted">Không có lịch sử điều chuyển</td></tr>
                ) : (
                  filtered.map((t) => {
                    const dir = directionOf(t)
                    return (
                      <tr key={t.id}>
                        <td><code>{t.transferOrderNo}</code></td>
                        <td>
                          <p className="fw-medium mb-0">{t.machine?.name}</p>
                          <small className="text-muted">{t.machine?.code} · {t.machine?.type ? MACHINE_TYPE_LABELS[t.machine.type] : ''}</small>
                        </td>
                        <td>{t.fromFactory?.name ?? '—'}</td>
                        <td>{t.toFactory?.name ?? '—'}</td>
                        {myFactoryId != null && (
                          <td>
                            {dir === 'out' && <span className="badge bg-danger-transparent text-danger"><i className="fe fe-arrow-up-right me-1"></i>Chuyển đi</span>}
                            {dir === 'in' && <span className="badge bg-success-transparent text-success"><i className="fe fe-arrow-down-left me-1"></i>Chuyển đến</span>}
                          </td>
                        )}
                        <td className="text-muted">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</td>
                        <td><span className={STATUS_BADGE[t.status]}>{TRANSFER_STATUS_LABELS[t.status]}</span></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {isCompanyLevel && (
        <p className="text-muted small mt-2 mb-0">Bạn đang xem toàn bộ lệnh điều chuyển của công ty.</p>
      )}
    </>
  )
}

// ===== Timeline điều chuyển theo từng máy (giữ nguyên) =====
function MachineTimeline() {
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)

  const { data: machinesData } = useMachines({ pageSize: 200 })
  const { data: history, isLoading } = useMachineTransferHistory(selectedMachineId ?? 0)

  const machineList = machinesData?.data ?? []
  const selectedMachine = machineList.find((m) => m.id === selectedMachineId)

  return (
    <>
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
                        <div className="col-md-6"><small className="text-muted">Duyệt lúc: {new Date(t.senderConfirmedAt).toLocaleString('vi-VN')}</small></div>
                      )}
                      {t.receiverConfirmedAt && (
                        <div className="col-md-6"><small className="text-muted">Bên nhận đồng ý: {new Date(t.receiverConfirmedAt).toLocaleString('vi-VN')}</small></div>
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
    </>
  )
}
