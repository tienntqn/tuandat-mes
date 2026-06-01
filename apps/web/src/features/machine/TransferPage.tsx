import { useState } from 'react'
import { Plus, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  useTransfers, useCreateTransfer, useConfirmSender, useConfirmReceiver, useRejectTransfer,
  useMachines,
} from './machine.hooks'
import type { MachineTransfer, CreateTransferDto, TransferStatus } from './machine.api'
import { TRANSFER_STATUS_LABELS, MACHINE_TYPE_LABELS } from './machine.api'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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

  const { user, isAdmin, hasRole } = useAuthStore()
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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Điều chuyển máy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workflow 2 bước xác nhận</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="rounded-lg border px-3 py-2 text-sm hover:bg-accent">↻</button>
          {canWrite && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo lệnh chuyển
            </button>
          )}
        </div>
      </div>

      {/* Workflow guide */}
      <div className="rounded-xl border bg-muted/30 p-4 flex items-center gap-3 text-sm flex-wrap">
        <WorkflowStep n={1} label="Tạo lệnh" color="bg-gray-200 text-gray-700" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <WorkflowStep n={2} label="Bên ĐƯA xác nhận" color="bg-amber-100 text-amber-700" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <WorkflowStep n={3} label="Bên NHẬN xác nhận → Máy đổi xưởng" color="bg-green-100 text-green-700" />
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.entries(TRANSFER_STATUS_LABELS) as [TransferStatus, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Số lệnh</th>
              <th className="px-4 py-3 text-left font-medium">Máy</th>
              <th className="px-4 py-3 text-left font-medium">Từ xưởng</th>
              <th className="px-4 py-3 text-left font-medium">Đến xưởng</th>
              <th className="px-4 py-3 text-left font-medium">Ngày chuyển</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Không có lệnh điều chuyển</td></tr>
            ) : (
              data?.data.map((t) => (
                <tr key={t.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{t.transferOrderNo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.machine?.name}</p>
                    <p className="text-xs text-muted-foreground">{t.machine?.code} · {t.machine?.type ? MACHINE_TYPE_LABELS[t.machine.type] : ''}</p>
                  </td>
                  <td className="px-4 py-3">{t.fromFactory?.name ?? '—'}</td>
                  <td className="px-4 py-3">{t.toFactory?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3"><TransferStatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDetailTarget(t)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground text-xs"
                        title="Chi tiết"
                      >
                        Chi tiết
                      </button>
                      {canWrite && t.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => confirmSender.mutate(t.id)}
                            disabled={confirmSender.isPending}
                            className="rounded-lg bg-amber-500 text-white px-2.5 py-1 text-xs hover:bg-amber-600 disabled:opacity-50"
                          >
                            XN Bên đưa
                          </button>
                          <button
                            onClick={() => setRejectTarget(t)}
                            className="rounded-lg bg-destructive text-destructive-foreground px-2.5 py-1 text-xs hover:bg-destructive/90"
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
                            className="rounded-lg bg-green-600 text-white px-2.5 py-1 text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            XN Bên nhận
                          </button>
                          <button
                            onClick={() => setRejectTarget(t)}
                            className="rounded-lg bg-destructive text-destructive-foreground px-2.5 py-1 text-xs hover:bg-destructive/90"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl p-5 space-y-4">
            <h2 className="font-bold text-lg">Từ chối lệnh điều chuyển</h2>
            <p className="text-sm text-muted-foreground">Lệnh: <strong>{rejectTarget.transferOrderNo}</strong></p>
            <div>
              <label className="text-sm font-medium mb-1 block">Lý do từ chối *</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejectTarget(null); setRejectReason('') }} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectTransfer.isPending}
                className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm hover:bg-destructive/90 disabled:opacity-50"
              >
                {rejectTransfer.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkflowStep({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      <span className="font-bold">{n}</span>
      <span>{label}</span>
    </div>
  )
}

function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const colorMap: Record<TransferStatus, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    SENDER_CONFIRMED: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}>
      {TRANSFER_STATUS_LABELS[status]}
    </span>
  )
}

function TransferDetailDialog({ transfer, onClose }: { transfer: MachineTransfer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Chi tiết lệnh điều chuyển</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Số lệnh" value={transfer.transferOrderNo} />
          <Row label="Máy" value={`${transfer.machine?.code} — ${transfer.machine?.name}`} />
          <Row label="Ngày chuyển" value={new Date(transfer.transferDate).toLocaleDateString('vi-VN')} />
          <Row label="Từ xưởng" value={transfer.fromFactory?.name ?? '—'} />
          <Row label="Đến xưởng" value={transfer.toFactory?.name ?? '—'} />
          <Row label="Lý do" value={transfer.reason} />
          <Row label="Người gửi" value={transfer.sender?.fullName ?? '—'} />
          <Row label="Người nhận" value={transfer.receiver?.fullName ?? '—'} />
          <Row label="Trạng thái" value={<TransferStatusBadge status={transfer.status} />} />
          {transfer.senderConfirmedAt && (
            <Row label="Bên đưa XN lúc" value={new Date(transfer.senderConfirmedAt).toLocaleString('vi-VN')} />
          )}
          {transfer.receiverConfirmedAt && (
            <Row label="Bên nhận XN lúc" value={new Date(transfer.receiverConfirmedAt).toLocaleString('vi-VN')} />
          )}
          {transfer.rejectReason && (
            <Row label="Lý do từ chối" value={<span className="text-destructive">{transfer.rejectReason}</span>} />
          )}
        </dl>
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Đóng</button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-36 shrink-0">{label}:</dt>
      <dd className="font-medium">{value}</dd>
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

  const selectedMachine = machines.find((m) => m.id === form.machineId)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card">
          <h2 className="font-bold text-lg">Tạo lệnh điều chuyển máy</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Máy *" error={errors.machineId}>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.machineId ?? ''}
              onChange={(e) => handleMachineChange(Number(e.target.value))}
            >
              <option value="">— Chọn máy —</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.factory?.name ?? '?'})</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Số lệnh chuyển *" error={errors.transferOrderNo}>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="VD: TC-2024-001"
                value={form.transferOrderNo ?? ''}
                onChange={(e) => setForm({ ...form, transferOrderNo: e.target.value })}
              />
            </Field>
            <Field label="Ngày chuyển *" error={errors.transferDate}>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.transferDate ?? ''}
                onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Lý do *" error={errors.reason}>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
              value={form.reason ?? ''}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Xưởng GỬI *" error={errors.fromFactoryId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.fromFactoryId ?? ''}
                onChange={(e) => setForm({ ...form, fromFactoryId: Number(e.target.value) })}
              >
                <option value="">— Chọn —</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Xưởng NHẬN *" error={errors.toFactoryId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Người bên ĐƯA *" error={errors.senderId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.senderId ?? ''}
                onChange={(e) => setForm({ ...form, senderId: Number(e.target.value) })}
              >
                <option value="">— Chọn —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Người bên NHẬN *" error={errors.receiverId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.receiverId ?? ''}
                onChange={(e) => setForm({ ...form, receiverId: Number(e.target.value) })}
              >
                <option value="">— Chọn —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Đang tạo...' : 'Tạo lệnh chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
