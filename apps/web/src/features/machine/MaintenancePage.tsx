import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useMaintenanceDue, useMaintenances, useCreateMaintenance, useMachines } from './machine.hooks'
import type { Machine, CreateMaintenanceDto, MaintenanceType } from './machine.api'
import { MACHINE_TYPE_LABELS } from './machine.api'
import { useAuthStore } from '@/stores/auth.store'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function MaintenancePage() {
  const [tab, setTab] = useState<'alert' | 'log'>('alert')
  const [logMachineId, setLogMachineId] = useState<number | null>(null)
  const [logPage, setLogPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data: dueMachines, isLoading: dueLoading } = useMaintenanceDue(14)
  const { data: allMachines } = useMachines({ pageSize: 200 })
  const { data: logData, isLoading: logLoading } = useMaintenances(logMachineId ?? 0, logPage)
  const createMaintenance = useCreateMaintenance()

  const machineList = allMachines?.data ?? []

  return (
    <PageWrapper
      title="Bảo dưỡng máy móc"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Bảo dưỡng' }]}
    >
      {/* Tabs */}
      <div className="nav nav-tabs mb-3">
        <a
          className={`nav-link ${tab === 'alert' ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setTab('alert')}
        >
          <i className="fe fe-alert-triangle me-1"></i>
          Cảnh báo bảo dưỡng
          {(dueMachines?.length ?? 0) > 0 && (
            <span className="badge bg-danger ms-2">{dueMachines!.length}</span>
          )}
        </a>
        <a
          className={`nav-link ${tab === 'log' ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setTab('log')}
        >
          <i className="fe fe-clock me-1"></i>
          Lịch sử bảo dưỡng
        </a>
      </div>

      {/* ALERT TAB */}
      {tab === 'alert' && (
        <div>
          <p className="text-muted mb-3">Các máy có hạn bảo dưỡng trong 14 ngày tới hoặc đã quá hạn.</p>
          {dueLoading ? (
            <p className="text-muted">Đang tải...</p>
          ) : !dueMachines?.length ? (
            <div className="d-flex flex-column align-items-center py-5 text-muted gap-2">
              <i className="fe fe-check-circle text-success" style={{ fontSize: 40 }}></i>
              <p>Tất cả máy đều trong hạn bảo dưỡng</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Máy</th>
                        <th>Loại</th>
                        <th>Xưởng</th>
                        <th>Chuyền</th>
                        <th>Hạn bảo dưỡng</th>
                        <th>Tình trạng</th>
                        {canWrite && <th className="text-end">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(dueMachines as any[]).map((m) => (
                        <tr key={m.id}>
                          <td>
                            <p className="fw-medium mb-0">{m.name}</p>
                            <small className="text-muted font-monospace">{m.code}</small>
                          </td>
                          <td className="text-muted">{MACHINE_TYPE_LABELS[m.type as keyof typeof MACHINE_TYPE_LABELS]}</td>
                          <td>{m.factory?.name ?? '—'}</td>
                          <td className="text-muted">
                            {m.line ? `Chuyền ${m.line.lineNumber}` : '—'}
                          </td>
                          <td>
                            <span className={m.isOverdue ? 'text-danger fw-bold' : 'text-warning fw-medium'}>
                              {m.isOverdue ? '⚠ QUÁ HẠN — ' : ''}
                              {new Date(m.nextDueDate).toLocaleDateString('vi-VN')}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${m.isOverdue ? 'bg-danger-transparent text-danger' : 'bg-warning-transparent text-warning'}`}>
                              {m.isOverdue ? 'Quá hạn' : 'Sắp đến hạn'}
                            </span>
                          </td>
                          {canWrite && (
                            <td className="text-end">
                              <button
                                onClick={() => {
                                  setLogMachineId(m.id)
                                  setTab('log')
                                  setFormOpen(true)
                                }}
                                className="btn btn-sm btn-primary text-white"
                              >
                                Ghi bảo dưỡng
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LOG TAB */}
      {tab === 'log' && (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <label className="fw-medium mb-0">Chọn máy:</label>
              <select
                className="form-select"
                style={{ width: 280 }}
                value={logMachineId ?? ''}
                onChange={(e) => { setLogMachineId(e.target.value ? Number(e.target.value) : null); setLogPage(1) }}
              >
                <option value="">— Chọn máy để xem lịch sử —</option>
                {machineList.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                ))}
              </select>
            </div>
            {canWrite && logMachineId && (
              <button
                onClick={() => setFormOpen(true)}
                className="btn btn-primary btn-icon text-white"
              >
                <span><i className="fe fe-plus"></i></span> Ghi bảo dưỡng
              </button>
            )}
          </div>

          {!logMachineId ? (
            <p className="py-5 text-center text-muted">Chọn máy để xem lịch sử bảo dưỡng</p>
          ) : logLoading ? (
            <p className="py-5 text-center text-muted">Đang tải...</p>
          ) : (
            <>
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover table-vcenter mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th>Ngày bảo dưỡng</th>
                          <th>Loại</th>
                          <th>Mô tả</th>
                          <th>Người thực hiện</th>
                          <th className="text-end">Chi phí</th>
                          <th>Hạn tiếp theo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logData?.data.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-4 text-muted">Chưa có lịch sử bảo dưỡng</td></tr>
                        ) : (
                          logData?.data.map((m) => (
                            <tr key={m.id}>
                              <td>{new Date(m.maintenanceDate).toLocaleDateString('vi-VN')}</td>
                              <td>
                                <span className={`badge ${m.type === 'PERIODIC' ? 'bg-primary-transparent text-primary' : 'bg-warning-transparent text-warning'}`}>
                                  {m.type === 'PERIODIC' ? 'Định kỳ' : 'Sửa chữa'}
                                </span>
                              </td>
                              <td style={{ maxWidth: 280 }}>
                                <span className="text-truncate d-inline-block" style={{ maxWidth: 280 }}>{m.description}</span>
                              </td>
                              <td className="text-muted">{m.performedBy ?? '—'}</td>
                              <td className="text-end text-muted">
                                {m.cost ? m.cost.toLocaleString('vi-VN') + ' đ' : '—'}
                              </td>
                              <td>
                                {m.nextDueDate ? (
                                  <span className={new Date(m.nextDueDate) < new Date() ? 'text-danger' : 'text-muted'}>
                                    {new Date(m.nextDueDate).toLocaleDateString('vi-VN')}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {logData && (
                <Pagination page={logPage} totalPages={logData.totalPages} total={logData.total} pageSize={logData.pageSize} onPageChange={setLogPage} />
              )}
            </>
          )}
        </div>
      )}

      {/* Form Ghi bảo dưỡng */}
      {formOpen && logMachineId && (
        <MaintenanceFormDialog
          machineId={logMachineId}
          machineList={machineList}
          onClose={() => setFormOpen(false)}
          onSubmit={(dto) => {
            createMaintenance.mutate(dto, { onSuccess: () => setFormOpen(false) })
          }}
          isPending={createMaintenance.isPending}
        />
      )}
    </PageWrapper>
  )
}

function MaintenanceFormDialog({
  machineId, machineList, onClose, onSubmit, isPending,
}: {
  machineId: number
  machineList: Machine[]
  onClose: () => void
  onSubmit: (dto: CreateMaintenanceDto) => void
  isPending?: boolean
}) {
  const [form, setForm] = useState<CreateMaintenanceDto>({
    machineId,
    maintenanceDate: new Date().toISOString().substring(0, 10),
    type: 'PERIODIC',
    description: '',
    performedBy: '',
    cost: undefined,
    nextDueDate: '',
  })
  const [errors, setErrors] = useState<{ description?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!form.description.trim()) e.description = 'Mô tả không được để trống'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) {
      onSubmit({
        ...form,
        performedBy: form.performedBy || undefined,
        nextDueDate: form.nextDueDate || undefined,
      })
    }
  }

  const machine = machineList.find((m) => m.id === machineId)

  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title">Ghi nhận bảo dưỡng</h5>
              {machine && <p className="text-muted small mb-0">{machine.code} — {machine.name}</p>}
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label fw-medium">Ngày bảo dưỡng *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.maintenanceDate}
                    onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-medium">Loại</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
                  >
                    <option value="PERIODIC">Định kỳ</option>
                    <option value="REPAIR">Sửa chữa</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium">Mô tả công việc *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Mô tả công việc bảo dưỡng..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  {errors.description && <div className="text-danger small mt-1">{errors.description}</div>}
                </div>
                <div className="col-6">
                  <label className="form-label fw-medium">Người thực hiện</label>
                  <input
                    className="form-control"
                    value={form.performedBy ?? ''}
                    onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-medium">Chi phí (đồng)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.cost ?? ''}
                    onChange={(e) => setForm({ ...form, cost: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium">Ngày bảo dưỡng tiếp theo</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.nextDueDate ?? ''}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-outline-secondary">
                Hủy
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary text-white"
              >
                {isPending ? 'Đang lưu...' : 'Lưu bảo dưỡng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
