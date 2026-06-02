import { useState } from 'react'
import {
  useTransfers, useCreateTransfer, useConfirmSender, useConfirmReceiver, useRejectTransfer,
  useMachines,
} from './machine.hooks'
import type { MachineTransfer, CreateTransferDto, TransferStatus } from './machine.api'
import { TRANSFER_STATUS_LABELS, MACHINE_TYPE_LABELS } from './machine.api'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import { useQuery } from '@tanstack/react-query'
import { employeeApi } from '@/features/employee/employee.api'

export default function TransferPage() {
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<MachineTransfer | null>(null)
  const [rejectTarget, setRejectTarget] = useState<MachineTransfer | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data, isLoading, refetch } = useTransfers({ status: filterStatus || undefined, page, pageSize: 20 } as any)
  const { data: machinesData } = useMachines({ pageSize: 200 })
  const { data: factories } = useQuery({ queryKey: ['factories-all'], queryFn: () => factoryApi.list({ pageSize: 100 }) })
  const { data: employees } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeeApi.list({ pageSize: 200 }) })

  const createTransfer = useCreateTransfer()
  const confirmSender = useConfirmSender()
  const confirmReceiver = useConfirmReceiver()
  const rejectTransfer = useRejectTransfer()

  const machineList = machinesData?.data ?? []
  const factoryList = factories?.data ?? []
  const employeeList = employees?.data ?? []

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return
    rejectTransfer.mutate({ id: rejectTarget.id, rejectReason }, {
      onSuccess: () => { setRejectTarget(null); setRejectReason('') },
    })
  }

  return (
    <PageWrapper
      title="Điều chuyển máy"
      breadcrumbs={[{ label: 'Máy móc' }, { label: 'Điều chuyển' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          {canWrite && (
            <button
              onClick={() => setFormOpen(true)}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Tạo lệnh chuyển
            </button>
          )}
        </div>
      }
    >
      {/* Workflow guide */}
      <div className="alert alert-light d-flex align-items-center gap-3 flex-wrap mb-3">
        <span className="badge bg-secondary-transparent text-secondary px-3 py-2">1 Tạo lệnh</span>
        <i className="fe fe-chevron-right text-muted"></i>
        <span className="badge bg-warning-transparent text-warning px-3 py-2">2 Bên ĐƯA xác nhận</span>
        <i className="fe fe-chevron-right text-muted"></i>
        <span className="badge bg-success-transparent text-success px-3 py-2">3 Bên NHẬN xác nhận → Máy đổi xưởng</span>
      </div>

      {/* Filter */}
      <div className="row mb-3">
        <div className="col-auto">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả trạng thái</option>
            {(Object.entries(TRANSFER_STATUS_LABELS) as [TransferStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
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
                  <th>Ngày chuyển</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Không có lệnh điều chuyển</td></tr>
                ) : (
                  data?.data.map((t) => (
                    <tr key={t.id}>
                      <td><code>{t.transferOrderNo}</code></td>
                      <td>
                        <p className="fw-medium mb-0">{t.machine?.name}</p>
                        <small className="text-muted">{t.machine?.code} · {t.machine?.type ? MACHINE_TYPE_LABELS[t.machine.type] : ''}</small>
                      </td>
                      <td>{t.fromFactory?.name ?? '—'}</td>
                      <td>{t.toFactory?.name ?? '—'}</td>
                      <td className="text-muted">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</td>
                      <td><TransferStatusBadge status={t.status} /></td>
                      <td>
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            onClick={() => setDetailTarget(t)}
                            className="btn btn-sm btn-outline-secondary"
                            title="Chi tiết"
                          >
                            Chi tiết
                          </button>
                          {canWrite && t.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => confirmSender.mutate(t.id)}
                                disabled={confirmSender.isPending}
                                className="btn btn-sm btn-warning text-white"
                              >
                                XN Bên đưa
                              </button>
                              <button
                                onClick={() => setRejectTarget(t)}
                                className="btn btn-sm btn-danger text-white"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          {canWrite && t.status === 'SENDER_CONFIRMED' && (
                            <>
                              <button
                                onClick={() => confirmReceiver.mutate(t.id)}
                                disabled={confirmReceiver.isPending}
                                className="btn btn-sm btn-success text-white"
                              >
                                XN Bên nhận
                              </button>
                              <button
                                onClick={() => setRejectTarget(t)}
                                className="btn btn-sm btn-danger text-white"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
      )}

      {/* Tạo lệnh chuyển */}
      {formOpen && (
        <TransferFormDialog
          machines={machineList}
          factories={factoryList}
          employees={employeeList}
          onClose={() => setFormOpen(false)}
          onSubmit={(dto) => createTransfer.mutate(dto, { onSuccess: () => setFormOpen(false) })}
          isPending={createTransfer.isPending}
        />
      )}

      {/* Chi tiết lệnh */}
      {detailTarget && (
        <TransferDetailDialog transfer={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      {/* Từ chối */}
      {rejectTarget && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Từ chối lệnh điều chuyển</h5>
              </div>
              <div className="modal-body">
                <p className="text-muted">Lệnh: <strong>{rejectTarget.transferOrderNo}</strong></p>
                <label className="form-label fw-medium">Lý do từ chối *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                />
              </div>
              <div className="modal-footer">
                <button onClick={() => { setRejectTarget(null); setRejectReason('') }} className="btn btn-outline-secondary">Hủy</button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectTransfer.isPending}
                  className="btn btn-danger text-white"
                >
                  {rejectTransfer.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const colorMap: Record<TransferStatus, string> = {
    PENDING: 'bg-secondary-transparent text-secondary',
    SENDER_CONFIRMED: 'bg-warning-transparent text-warning',
    COMPLETED: 'bg-success-transparent text-success',
    REJECTED: 'bg-danger-transparent text-danger',
  }
  return (
    <span className={`badge ${colorMap[status]}`}>
      {TRANSFER_STATUS_LABELS[status]}
    </span>
  )
}

function TransferDetailDialog({ transfer, onClose }: { transfer: MachineTransfer; onClose: () => void }) {
  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Chi tiết lệnh điều chuyển</h5>
            <button onClick={onClose} type="button" className="btn-close"></button>
          </div>
          <div className="modal-body">
            <dl className="row mb-0">
              <dt className="col-4 text-muted">Số lệnh</dt><dd className="col-8 fw-medium">{transfer.transferOrderNo}</dd>
              <dt className="col-4 text-muted">Máy</dt><dd className="col-8 fw-medium">{transfer.machine?.code} — {transfer.machine?.name}</dd>
              <dt className="col-4 text-muted">Ngày chuyển</dt><dd className="col-8">{new Date(transfer.transferDate).toLocaleDateString('vi-VN')}</dd>
              <dt className="col-4 text-muted">Từ xưởng</dt><dd className="col-8">{transfer.fromFactory?.name ?? '—'}</dd>
              <dt className="col-4 text-muted">Đến xưởng</dt><dd className="col-8">{transfer.toFactory?.name ?? '—'}</dd>
              <dt className="col-4 text-muted">Lý do</dt><dd className="col-8">{transfer.reason}</dd>
              <dt className="col-4 text-muted">Người gửi</dt><dd className="col-8">{transfer.sender?.fullName ?? '—'}</dd>
              <dt className="col-4 text-muted">Người nhận</dt><dd className="col-8">{transfer.receiver?.fullName ?? '—'}</dd>
              <dt className="col-4 text-muted">Trạng thái</dt><dd className="col-8"><TransferStatusBadge status={transfer.status} /></dd>
              {transfer.senderConfirmedAt && (
                <><dt className="col-4 text-muted">Bên đưa XN lúc</dt><dd className="col-8">{new Date(transfer.senderConfirmedAt).toLocaleString('vi-VN')}</dd></>
              )}
              {transfer.receiverConfirmedAt && (
                <><dt className="col-4 text-muted">Bên nhận XN lúc</dt><dd className="col-8">{new Date(transfer.receiverConfirmedAt).toLocaleString('vi-VN')}</dd></>
              )}
              {transfer.rejectReason && (
                <><dt className="col-4 text-muted">Lý do từ chối</dt><dd className="col-8 text-danger">{transfer.rejectReason}</dd></>
              )}
            </dl>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-outline-secondary">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-medium">{label}</label>
      {children}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  )
}

function TransferFormDialog({
  machines, factories, employees, onClose, onSubmit, isPending,
}: {
  machines: any[]
  factories: any[]
  employees: any[]
  onClose: () => void
  onSubmit: (dto: CreateTransferDto) => void
  isPending?: boolean
}) {
  const [form, setForm] = useState<Partial<CreateTransferDto>>({
    transferDate: new Date().toISOString().substring(0, 10),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.machineId) e.machineId = 'Chọn máy'
    if (!form.transferOrderNo?.trim()) e.transferOrderNo = 'Nhập số lệnh'
    if (!form.transferDate) e.transferDate = 'Chọn ngày'
    if (!form.reason?.trim()) e.reason = 'Nhập lý do'
    if (!form.fromFactoryId) e.fromFactoryId = 'Chọn xưởng gửi'
    if (!form.toFactoryId) e.toFactoryId = 'Chọn xưởng nhận'
    if (form.fromFactoryId === form.toFactoryId) e.toFactoryId = 'Xưởng gửi và nhận không được trùng'
    if (!form.senderId) e.senderId = 'Chọn người gửi'
    if (!form.receiverId) e.receiverId = 'Chọn người nhận'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(form as CreateTransferDto)
  }

  // Khi chọn máy, tự điền xưởng gửi
  const handleMachineChange = (machineId: number) => {
    const m = machines.find((m) => m.id === machineId)
    setForm({ ...form, machineId, fromFactoryId: m?.factoryId })
  }

  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tạo lệnh điều chuyển máy</h5>
            <button onClick={onClose} type="button" className="btn-close"></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <Field label="Máy *" error={errors.machineId}>
                <select
                  className="form-select"
                  value={form.machineId ?? ''}
                  onChange={(e) => handleMachineChange(Number(e.target.value))}
                >
                  <option value="">— Chọn máy —</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.factory?.name ?? '?'})</option>
                  ))}
                </select>
              </Field>

              <div className="row g-3">
                <div className="col-6">
                  <Field label="Số lệnh chuyển *" error={errors.transferOrderNo}>
                    <input
                      className="form-control"
                      placeholder="VD: TC-2024-001"
                      value={form.transferOrderNo ?? ''}
                      onChange={(e) => setForm({ ...form, transferOrderNo: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-6">
                  <Field label="Ngày chuyển *" error={errors.transferDate}>
                    <input
                      type="date"
                      className="form-control"
                      value={form.transferDate ?? ''}
                      onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Lý do *" error={errors.reason}>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.reason ?? ''}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </Field>

              <div className="row g-3">
                <div className="col-6">
                  <Field label="Xưởng GỬI *" error={errors.fromFactoryId}>
                    <select
                      className="form-select"
                      value={form.fromFactoryId ?? ''}
                      onChange={(e) => setForm({ ...form, fromFactoryId: Number(e.target.value) })}
                    >
                      <option value="">— Chọn —</option>
                      {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-6">
                  <Field label="Xưởng NHẬN *" error={errors.toFactoryId}>
                    <select
                      className="form-select"
                      value={form.toFactoryId ?? ''}
                      onChange={(e) => setForm({ ...form, toFactoryId: Number(e.target.value) })}
                    >
                      <option value="">— Chọn —</option>
                      {factories.filter((f) => f.id !== form.fromFactoryId).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <Field label="Người bên ĐƯA *" error={errors.senderId}>
                    <select
                      className="form-select"
                      value={form.senderId ?? ''}
                      onChange={(e) => setForm({ ...form, senderId: Number(e.target.value) })}
                    >
                      <option value="">— Chọn —</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-6">
                  <Field label="Người bên NHẬN *" error={errors.receiverId}>
                    <select
                      className="form-select"
                      value={form.receiverId ?? ''}
                      onChange={(e) => setForm({ ...form, receiverId: Number(e.target.value) })}
                    >
                      <option value="">— Chọn —</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-outline-secondary">Hủy</button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary text-white"
              >
                {isPending ? 'Đang tạo...' : 'Tạo lệnh chuyển'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
