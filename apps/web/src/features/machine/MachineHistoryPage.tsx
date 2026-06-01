import { useState } from 'react'
import { useMachineTransferHistory, useMachines } from './machine.hooks'
import { TRANSFER_STATUS_LABELS, MACHINE_TYPE_LABELS } from './machine.api'
import type { TransferStatus } from './machine.api'

export default function MachineHistoryPage() {
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)

  const { data: machinesData } = useMachines({ pageSize: 200 })
  const { data: history, isLoading } = useMachineTransferHistory(selectedMachineId ?? 0)

  const machineList = machinesData?.data ?? []
  const selectedMachine = machineList.find((m) => m.id === selectedMachineId)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Lịch sử di chuyển máy</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Chọn máy:</label>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background w-72"
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

      {selectedMachine && (
        <div className="rounded-xl border bg-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <InfoItem label="Mã máy" value={selectedMachine.code} />
          <InfoItem label="Tên" value={selectedMachine.name} />
          <InfoItem label="Xưởng hiện tại" value={selectedMachine.factory?.name ?? '—'} />
          <InfoItem label="Chuyền hiện tại" value={selectedMachine.line ? `Chuyền ${selectedMachine.line.lineNumber}` : 'Chưa gán'} />
        </div>
      )}

      {!selectedMachineId ? (
        <p className="py-12 text-center text-muted-foreground">Chọn máy để xem timeline điều chuyển</p>
      ) : isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Đang tải...</p>
      ) : !history?.length ? (
        <p className="py-12 text-center text-muted-foreground">Máy này chưa có lịch sử điều chuyển</p>
      ) : (
        <div className="relative">
          {/* Timeline */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4 ml-12">
            {history.map((t, idx) => (
              <div key={t.id} className="relative">
                {/* Dot */}
                <div
                  className={`absolute -left-[2.65rem] top-3 h-4 w-4 rounded-full border-2 border-background ${
                    t.status === 'COMPLETED' ? 'bg-green-500' :
                    t.status === 'REJECTED' ? 'bg-red-500' :
                    t.status === 'SENDER_CONFIRMED' ? 'bg-amber-400' : 'bg-gray-300'
                  }`}
                />
                <div className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{t.transferOrderNo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <TransferStatusBadge status={t.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t.fromFactory?.name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{t.toFactory?.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{t.reason}"</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Người gửi: {t.sender?.fullName ?? '—'}</span>
                    <span>Người nhận: {t.receiver?.fullName ?? '—'}</span>
                    {t.senderConfirmedAt && (
                      <span>Bên đưa XN: {new Date(t.senderConfirmedAt).toLocaleString('vi-VN')}</span>
                    )}
                    {t.receiverConfirmedAt && (
                      <span>Bên nhận XN: {new Date(t.receiverConfirmedAt).toLocaleString('vi-VN')}</span>
                    )}
                  </div>
                  {t.rejectReason && (
                    <p className="text-xs text-destructive">Lý do từ chối: {t.rejectReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
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
