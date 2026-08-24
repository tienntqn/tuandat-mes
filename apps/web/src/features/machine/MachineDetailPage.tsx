import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash, AlertTriangle, X, Wrench, Package, Repeat } from 'lucide-react'
import { useMachine, useUpdateMachine, useLiquidateMachine } from './machine.hooks'
import { MachineFormDialog } from './MachineFormDialog'
import { RepairProposalDialog } from './RepairProposalDialog'
import { useCreateRepairProposal } from './repair.hooks'
import type { RepairProposalType } from './repair.api'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { QRCode } from '@/components/shared/QRCode'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { factoryApi } from '@/features/factory/factory.api'
import { lineApi } from '@/features/production-line/line.api'
import { MACHINE_TYPE_LABELS, MACHINE_STATUS_LABELS, type CreateMachineDto, type LiquidateMachineDto } from './machine.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const machineId = Number(id)
  const navigate = useNavigate()
  const { data: machine, isLoading } = useMachine(machineId)
  const updateMachine = useUpdateMachine()
  const liquidate = useLiquidateMachine()
  const [editOpen, setEditOpen] = useState(false)
  const [liqOpen, setLiqOpen] = useState(false)
  const [repairOpen, setRepairOpen] = useState(false)
  const [repairType, setRepairType] = useState<RepairProposalType>('REPAIR')
  const createRepair = useCreateRepairProposal()

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  const canLiquidate = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data: factories } = useQuery({ queryKey: ['factories-all'], queryFn: () => factoryApi.list({ pageSize: 100 }), enabled: editOpen })
  const { data: linesData } = useQuery({ queryKey: ['lines-all'], queryFn: () => lineApi.list({ pageSize: 200 }), enabled: editOpen })

  if (isLoading || !machine) {
    return (
      <PageWrapper title="Chi tiết máy" breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Chi tiết' }]}>
        <div className="text-center py-5 text-muted">Đang tải...</div>
      </PageWrapper>
    )
  }

  const warrantyLeft = machine.warrantyExpiry ? Math.ceil((new Date(machine.warrantyExpiry).getTime() - Date.now()) / 86400000) : null
  const detailUrl = `${window.location.origin}/machines/${machine.id}`

  const handleUpdate = (dto: CreateMachineDto) => {
    updateMachine.mutate({ id: machine.id, dto }, { onSuccess: () => setEditOpen(false) })
  }

  return (
    <PageWrapper
      title={`${machine.code} — ${machine.name}`}
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Chi tiết máy' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => navigate('/machines')} className="btn btn-outline-secondary btn-icon"><span><ArrowLeft size={16} /></span> Danh sách</button>
          {canWrite && !machine.liquidatedAt && <button onClick={() => setEditOpen(true)} className="btn btn-primary btn-icon text-white"><span><Edit2 size={15} /></span> Sửa</button>}
          {canLiquidate && !machine.liquidatedAt && <button onClick={() => setLiqOpen(true)} className="btn btn-outline-danger btn-icon"><span><Trash size={15} /></span> Thanh lý</button>}
        </div>
      }
    >
      {machine.liquidatedAt && (
        <div className="alert alert-secondary d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> Máy đã được thanh lý ngày {fmtDate(machine.liquidatedAt)}.
        </div>
      )}
      {warrantyLeft !== null && warrantyLeft >= 0 && warrantyLeft <= 30 && (
        <div className="alert alert-warning d-flex align-items-center gap-2"><AlertTriangle size={16} /> Bảo hành còn {warrantyLeft} ngày (hết hạn {fmtDate(machine.warrantyExpiry)}).</div>
      )}
      {warrantyLeft !== null && warrantyLeft < 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2"><AlertTriangle size={16} /> Đã hết hạn bảo hành ({fmtDate(machine.warrantyExpiry)}).</div>
      )}

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-header"><h6 className="card-title mb-0">Thông tin máy</h6></div>
            <div className="card-body">
              <dl className="row mb-0">
                {[
                  ['Mã máy', machine.code],
                  ['Tên máy', machine.name],
                  ['Loại', MACHINE_TYPE_LABELS[machine.type]],
                  ['Chủng loại', machine.category?.name ?? '—'],
                  ['Hãng SX', machine.brandRef?.name ?? machine.brand ?? '—'],
                  ['Model', machine.model ?? '—'],
                  ['Số serial', machine.serialNo ?? '—'],
                  ['Năm SX', machine.manufactureYear ?? '—'],
                  ['Ngày mua', fmtDate(machine.purchaseDate)],
                  ['Hạn bảo hành', fmtDate(machine.warrantyExpiry)],
                  ['Xưởng', machine.factory?.name ?? '—'],
                  ['Chuyền', machine.line?.name ?? 'Chưa gán'],
                ].map(([label, value]) => (
                  <div key={label as string} className="col-sm-6 d-flex mb-2">
                    <div className="text-muted" style={{ minWidth: 110 }}>{label}</div>
                    <div className="fw-medium">{value as string}</div>
                  </div>
                ))}
                <div className="col-sm-6 d-flex mb-2">
                  <div className="text-muted" style={{ minWidth: 110 }}>Trạng thái</div>
                  <div><StatusBadge status={machine.status} /> <span className="ms-1 small text-muted">{MACHINE_STATUS_LABELS[machine.status]}</span></div>
                </div>
              </dl>
              {machine.note && <div className="mt-2 text-muted small">Ghi chú: {machine.note}</div>}
            </div>
          </div>

          {/* Hình ảnh */}
          <div className="card mb-3">
            <div className="card-header"><h6 className="card-title mb-0">Hình ảnh</h6></div>
            <div className="card-body">
              {machine.images && machine.images.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {machine.images.map((im) => (
                    <a key={im.id} href={im.url} target="_blank" rel="noreferrer">
                      <img src={im.url} alt={im.caption ?? ''} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} className="border" />
                    </a>
                  ))}
                </div>
              ) : <div className="text-muted small">Chưa có hình ảnh</div>}
            </div>
          </div>

          {machine.liquidation && (
            <div className="card mb-3">
              <div className="card-header"><h6 className="card-title mb-0">Thông tin thanh lý</h6></div>
              <div className="card-body small">
                <div>Ngày: {fmtDate(machine.liquidation.liquidationDate)}</div>
                <div>Lý do: {machine.liquidation.reason}</div>
                {machine.liquidation.decisionNo && <div>Số quyết định: {machine.liquidation.decisionNo}</div>}
                {machine.liquidation.salvageValue != null && <div>Giá trị thu hồi: {Number(machine.liquidation.salvageValue).toLocaleString('vi-VN')} đ</div>}
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-header"><h6 className="card-title mb-0">Mã QR</h6></div>
            <div className="card-body d-flex justify-content-center">
              <QRCode value={detailUrl} title={machine.code} subtitle={machine.name} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h6 className="card-title mb-0">Thao tác nhanh</h6></div>
            <div className="card-body d-flex flex-column gap-2">
              {canWrite && !machine.liquidatedAt && (
                <>
                  <button onClick={() => { setRepairType('REPAIR'); setRepairOpen(true) }} className="btn btn-primary btn-sm text-white d-inline-flex align-items-center justify-content-center gap-2">
                    <Wrench size={15} /> Đề xuất sửa chữa
                  </button>
                  <button onClick={() => { setRepairType('REPLACEMENT'); setRepairOpen(true) }} className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-2">
                    <Package size={15} /> Thay thế linh kiện
                  </button>
                  <button onClick={() => navigate('/machines/transfers', { state: { presetMachineId: machine.id } })} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-2">
                    <Repeat size={15} /> Điều chuyển máy
                  </button>
                  <hr className="my-1" />
                </>
              )}
              <Link to="/machines/maintenance" className="btn btn-outline-secondary btn-sm">Lịch sử bảo dưỡng</Link>
              <Link to="/machines/repairs" className="btn btn-outline-secondary btn-sm">Danh sách đề xuất</Link>
            </div>
          </div>
        </div>
      </div>

      <MachineFormDialog
        open={editOpen}
        machine={machine}
        factories={factories?.data ?? []}
        lines={linesData?.data ?? []}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        isPending={updateMachine.isPending}
      />

      <LiquidateDialog
        open={liqOpen}
        onClose={() => setLiqOpen(false)}
        isPending={liquidate.isPending}
        onSubmit={(dto) => liquidate.mutate({ id: machine.id, dto }, { onSuccess: () => { setLiqOpen(false); navigate('/machines') } })}
      />

      <RepairProposalDialog
        open={repairOpen}
        defaultMachineId={machine.id}
        defaultType={repairType}
        onClose={() => setRepairOpen(false)}
        isPending={createRepair.isPending}
        onSubmit={(dto) => createRepair.mutate(dto, { onSuccess: () => setRepairOpen(false) })}
      />

      <style>{`@media print { .app-sidebar, .app-header, .page-header, .card-header, .btn, .alert { display: none !important; } .qr-print { border: none !important; } body * { visibility: hidden; } .qr-print, .qr-print * { visibility: visible; } .qr-print { position: absolute; left: 0; top: 0; } }`}</style>
    </PageWrapper>
  )
}

function LiquidateDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (dto: LiquidateMachineDto) => void; isPending?: boolean }) {
  const [form, setForm] = useState<LiquidateMachineDto>({ liquidationDate: new Date().toISOString().slice(0, 10), reason: '' })
  const [error, setError] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">Thanh lý máy</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.reason.trim()) { setError('Nhập lý do thanh lý'); return } onSubmit(form) }} className="p-5 space-y-3">
          <div><label className="text-sm font-medium mb-1 block">Ngày thanh lý *</label><input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.liquidationDate} onChange={(e) => setForm({ ...form, liquidationDate: e.target.value })} /></div>
          <div><label className="text-sm font-medium mb-1 block">Lý do *</label><textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="VD: Hỏng nặng, không sửa được" />{error && <p className="text-xs text-destructive mt-1">{error}</p>}</div>
          <div className="d-flex gap-2">
            <div className="flex-fill"><label className="text-sm font-medium mb-1 block">Số quyết định</label><input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.decisionNo ?? ''} onChange={(e) => setForm({ ...form, decisionNo: e.target.value })} /></div>
            <div className="flex-fill"><label className="text-sm font-medium mb-1 block">Giá trị thu hồi</label><input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.salvageValue ?? ''} onChange={(e) => setForm({ ...form, salvageValue: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-destructive px-4 py-2 text-sm text-white disabled:opacity-50" style={{ background: '#dc3545' }}>{isPending ? 'Đang lưu...' : 'Thanh lý'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
