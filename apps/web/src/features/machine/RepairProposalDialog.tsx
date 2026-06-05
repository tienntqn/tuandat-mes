import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { RepairProposal, CreateRepairProposalDto, RepairProposalType } from './repair.api'
import { REPAIR_TYPE_LABELS } from './repair.api'
import { useMachines } from './machine.hooks'
import { useSparePartsActive } from './catalog.hooks'
import { FileUpload, type UploadedFile } from '@/components/shared/FileUpload'

interface Props {
  open: boolean
  proposal?: RepairProposal | null
  defaultMachineId?: number
  onClose: () => void
  onSubmit: (dto: CreateRepairProposalDto) => void
  isPending?: boolean
}

interface ItemRow { sparePartId?: number; name: string; quantity: number; unit?: string; note?: string }

export function RepairProposalDialog({ open, proposal, defaultMachineId, onClose, onSubmit, isPending }: Props) {
  const [machineId, setMachineId] = useState<number | ''>('')
  const [type, setType] = useState<RepairProposalType>('REPAIR')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState<string>('')
  const [items, setItems] = useState<ItemRow[]>([])
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')

  const { data: machinesData } = useMachines({ pageSize: 200 })
  const machines = machinesData?.data ?? []
  const { data: spareParts = [] } = useSparePartsActive()

  useEffect(() => {
    if (!open) return
    if (proposal) {
      setMachineId(proposal.machineId)
      setType(proposal.type)
      setTitle(proposal.title)
      setDescription(proposal.description ?? '')
      setEstimatedCost(proposal.estimatedCost != null ? String(proposal.estimatedCost) : '')
      setItems((proposal.items ?? []).map((it) => ({ sparePartId: it.sparePartId ?? undefined, name: it.name, quantity: it.quantity, unit: it.unit ?? undefined, note: it.note ?? undefined })))
      setAttachments((proposal.attachments ?? []).map((a) => ({ url: a.url, type: a.type, filename: a.filename ?? undefined })))
    } else {
      setMachineId(defaultMachineId ?? '')
      setType('REPAIR')
      setTitle('')
      setDescription('')
      setEstimatedCost('')
      setItems([])
      setAttachments([])
    }
    setError('')
  }, [open, proposal, defaultMachineId])

  const addItem = () => setItems((r) => [...r, { name: '', quantity: 1 }])
  const removeItem = (i: number) => setItems((r) => r.filter((_, idx) => idx !== i))
  const setItem = (i: number, patch: Partial<ItemRow>) => setItems((r) => r.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const onPickSparePart = (i: number, spId: string) => {
    if (!spId) { setItem(i, { sparePartId: undefined }); return }
    const sp = spareParts.find((s) => s.id === Number(spId))
    setItem(i, { sparePartId: Number(spId), name: sp?.name ?? items[i].name, unit: sp?.unit ?? items[i].unit })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!machineId) { setError('Vui lòng chọn máy'); return }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề'); return }
    const cleanItems = items.filter((it) => it.name.trim() && it.quantity > 0)
    onSubmit({
      machineId: Number(machineId),
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      items: cleanItems.length ? cleanItems : undefined,
      attachments: attachments.length ? attachments.map((a) => ({ type: a.type, url: a.url, filename: a.filename })) : undefined,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">{proposal ? `Sửa đề xuất ${proposal.proposalNo}` : 'Tạo đề xuất sửa chữa'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Máy *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={machineId} onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : '')} disabled={!!defaultMachineId}>
                <option value="">— Chọn máy —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Loại đề xuất *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={type} onChange={(e) => setType(e.target.value as RepairProposalType)}>
                {(Object.entries(REPAIR_TYPE_LABELS) as [RepairProposalType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tiêu đề *</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Thay bo mạch máy may DDL-8700" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả tình trạng</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Hạng mục / phụ tùng */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="text-sm font-medium">Phụ tùng / hạng mục</label>
              <button type="button" onClick={addItem} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"><Plus size={14} /> Thêm dòng</button>
            </div>
            {items.length === 0 && <div className="text-muted small">Chưa có hạng mục nào</div>}
            {items.map((it, i) => (
              <div key={i} className="d-flex gap-1 mb-2 align-items-start">
                <select className="rounded-lg border px-2 py-2 text-sm bg-background" style={{ minWidth: 130 }} value={it.sparePartId ?? ''} onChange={(e) => onPickSparePart(i, e.target.value)}>
                  <option value="">— Tự nhập —</option>
                  {spareParts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="rounded-lg border px-2 py-2 text-sm flex-fill" placeholder="Tên hạng mục" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                <input type="number" min={1} className="rounded-lg border px-2 py-2 text-sm" style={{ width: 64 }} value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 1 })} />
                <input className="rounded-lg border px-2 py-2 text-sm" style={{ width: 64 }} placeholder="ĐV" value={it.unit ?? ''} onChange={(e) => setItem(i, { unit: e.target.value })} />
                <button type="button" onClick={() => removeItem(i)} className="btn btn-sm btn-outline-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Chi phí dự kiến (đ)</label>
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
            </div>
          </div>

          <FileUpload label="Đính kèm ảnh / video tình trạng máy" value={attachments} onChange={setAttachments} accept="media" max={10} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{isPending ? 'Đang lưu...' : proposal ? 'Cập nhật' : 'Tạo đề xuất'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
