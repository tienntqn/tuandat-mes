import { useState } from 'react'
import { Plus, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { useMaintenanceDue, useMaintenances, useCreateMaintenance, useMachines } from './machine.hooks'
import type { Machine, CreateMaintenanceDto, MaintenanceType } from './machine.api'
import { MACHINE_TYPE_LABELS } from './machine.api'
import { useAuthStore } from '@/stores/auth.store'
import { Pagination } from '@/components/shared/Pagination'

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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bảo dưỡng máy móc</h1>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        <TabBtn active={tab === 'alert'} onClick={() => setTab('alert')}>
          <AlertTriangle className="h-4 w-4 inline mr-1.5" />
          Cảnh báo bảo dưỡng
          {(dueMachines?.length ?? 0) > 0 && (
            <span className="ml-1.5 rounded-full bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5">
              {dueMachines!.length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'log'} onClick={() => setTab('log')}>
          <Clock className="h-4 w-4 inline mr-1.5" />
          Lịch sử bảo dưỡng
        </TabBtn>
      </div>

      {/* ALERT TAB */}
      {tab === 'alert' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Các máy có hạn bảo dưỡng trong 14 ngày tới hoặc đã quá hạn.</p>
          {dueLoading ? (
            <p className="text-muted-foreground">Đang tải...</p>
          ) : !dueMachines?.length ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p>Tất cả máy đều trong hạn bảo dưỡng</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Máy</th>
                    <th className="px-4 py-3 text-left font-medium">Loại</th>
                    <th className="px-4 py-3 text-left font-medium">Xưởng</th>
                    <th className="px-4 py-3 text-left font-medium">Chuyền</th>
                    <th className="px-4 py-3 text-left font-medium">Hạn bảo dưỡng</th>
                    <th className="px-4 py-3 text-left font-medium">Tình trạng</th>
                    {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {(dueMachines as any[]).map((m) => (
                    <tr key={m.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.code}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{MACHINE_TYPE_LABELS[m.type as keyof typeof MACHINE_TYPE_LABELS]}</td>
                      <td className="px-4 py-3">{m.factory?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.line ? `Chuyền ${m.line.lineNumber}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={m.isOverdue ? 'text-destructive font-bold' : 'text-amber-600 font-medium'}>
                          {m.isOverdue ? '⚠ QUÁ HẠN — ' : ''}
                          {new Date(m.nextDueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.isOverdue ? 'Quá hạn' : 'Sắp đến hạn'}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setLogMachineId(m.id)
                              setTab('log')
                              setFormOpen(true)
                            }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
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
          )}
        </div>
      )}

      {/* LOG TAB */}
      {tab === 'log' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Chọn máy:</label>
              <select
                className="rounded-lg border px-3 py-2 text-sm bg-background w-64"
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
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Ghi bảo dưỡng
              </button>
            )}
          </div>

          {!logMachineId ? (
            <p className="py-8 text-center text-muted-foreground">Chọn máy để xem lịch sử bảo dưỡng</p>
          ) : logLoading ? (
            <p className="py-8 text-center text-muted-foreground">Đang tải...</p>
          ) : (
            <>
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Ngày bảo dưỡng</th>
                      <th className="px-4 py-3 text-left font-medium">Loại</th>
                      <th className="px-4 py-3 text-left font-medium">Mô tả</th>
                      <th className="px-4 py-3 text-left font-medium">Người thực hiện</th>
                      <th className="px-4 py-3 text-right font-medium">Chi phí</th>
                      <th className="px-4 py-3 text-left font-medium">Hạn tiếp theo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logData?.data.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chưa có lịch sử bảo dưỡng</td></tr>
                    ) : (
                      logData?.data.map((m) => (
                        <tr key={m.id} className="border-t hover:bg-muted/20">
                          <td className="px-4 py-3">{new Date(m.maintenanceDate).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.type === 'PERIODIC' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {m.type === 'PERIODIC' ? 'Định kỳ' : 'Sửa chữa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate">{m.description}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.performedBy ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {m.cost ? m.cost.toLocaleString('vi-VN') + ' đ' : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {m.nextDueDate ? (
                              <span className={new Date(m.nextDueDate) < new Date() ? 'text-destructive' : 'text-muted-foreground'}>
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
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-lg">Ghi nhận bảo dưỡng</h2>
            {machine && <p className="text-sm text-muted-foreground">{machine.code} — {machine.name}</p>}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ngày bảo dưỡng *</label>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.maintenanceDate}
                onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Loại</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
              >
                <option value="PERIODIC">Định kỳ</option>
                <option value="REPAIR">Sửa chữa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả công việc *</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Mô tả công việc bảo dưỡng..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Người thực hiện</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.performedBy ?? ''}
                onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Chi phí (đồng)</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.cost ?? ''}
                onChange={(e) => setForm({ ...form, cost: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Ngày bảo dưỡng tiếp theo</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.nextDueDate ?? ''}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Đang lưu...' : 'Lưu bảo dưỡng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
