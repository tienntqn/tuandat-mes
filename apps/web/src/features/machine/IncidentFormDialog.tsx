import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useMachines } from './machine.hooks'
import type { CreateIncidentDto, IncidentReport } from './breakdown.api'
import { FileUpload, type UploadedFile } from '@/components/shared/FileUpload'

interface Props {
  open: boolean
  incident?: IncidentReport | null
  defaultMachineId?: number
  breakdownReportId?: number
  defaultDescription?: string
  onClose: () => void
  onSubmit: (dto: CreateIncidentDto) => void
  isPending?: boolean
}

/** Form lập/sửa biên bản sự cố — dùng ở trang báo hỏng và trang biên bản sự cố. */
export function IncidentFormDialog({
  open, incident, defaultMachineId, breakdownReportId, defaultDescription, onClose, onSubmit, isPending,
}: Props) {
  const today = new Date().toISOString().slice(0, 16)
  const [machineId, setMachineId] = useState<number | ''>('')
  const [incidentDate, setIncidentDate] = useState(today)
  const [description, setDescription] = useState('')
  const [cause, setCause] = useState('')
  const [consequence, setConsequence] = useState('')
  const [downtimeHours, setDowntimeHours] = useState<string>('')
  const [damageValue, setDamageValue] = useState<string>('')
  const [responsibleParty, setResponsibleParty] = useState('')
  const [preventiveAction, setPreventiveAction] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [images, setImages] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')

  const { data: machinesData } = useMachines({ pageSize: 500 })
  const machines = machinesData?.data ?? []

  useEffect(() => {
    if (!open) return
    setError('')
    if (incident) {
      setMachineId(incident.machineId)
      setIncidentDate(incident.incidentDate.slice(0, 16))
      setDescription(incident.description)
      setCause(incident.cause ?? '')
      setConsequence(incident.consequence ?? '')
      setDowntimeHours(incident.downtimeHours != null ? String(incident.downtimeHours) : '')
      setDamageValue(incident.damageValue != null ? String(incident.damageValue) : '')
      setResponsibleParty(incident.responsibleParty ?? '')
      setPreventiveAction(incident.preventiveAction ?? '')
      setWitnesses(incident.witnesses ?? '')
      setImages((incident.imageUrls ?? []).map((url) => ({ url, type: 'IMAGE' as const })))
    } else {
      setMachineId(defaultMachineId ?? '')
      setIncidentDate(new Date().toISOString().slice(0, 16))
      setDescription(defaultDescription ?? '')
      setCause(''); setConsequence(''); setDowntimeHours(''); setDamageValue('')
      setResponsibleParty(''); setPreventiveAction(''); setWitnesses(''); setImages([])
    }
  }, [open, incident, defaultMachineId, defaultDescription])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">{incident ? `Sửa biên bản ${incident.incidentNo}` : 'Lập biên bản sự cố'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!machineId) { setError('Phải chọn máy'); return }
            if (!description.trim()) { setError('Phải mô tả diễn biến sự cố'); return }
            onSubmit({
              machineId: Number(machineId),
              breakdownReportId,
              incidentDate: new Date(incidentDate).toISOString(),
              description: description.trim(),
              cause: cause.trim() || undefined,
              consequence: consequence.trim() || undefined,
              downtimeHours: downtimeHours ? Number(downtimeHours) : undefined,
              damageValue: damageValue ? Number(damageValue) : undefined,
              responsibleParty: responsibleParty.trim() || undefined,
              preventiveAction: preventiveAction.trim() || undefined,
              witnesses: witnesses.trim() || undefined,
              imageUrls: images.map((i) => i.url),
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Máy *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : '')} disabled={!!defaultMachineId || !!incident}>
                <option value="">— Chọn máy —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
              </select>
            </div>
            <div style={{ width: 220 }}>
              <label className="text-sm font-medium mb-1 block">Thời điểm sự cố *</label>
              <input type="datetime-local" className="w-full rounded-lg border px-3 py-2 text-sm" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Diễn biến sự cố *</label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả sự việc xảy ra như thế nào" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Nguyên nhân</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={cause} onChange={(e) => setCause(e.target.value)} placeholder="VD: Vận hành sai quy trình, hết dầu bôi trơn" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Hậu quả</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="VD: Dừng chuyền 3 giờ, hỏng 20 sản phẩm" />
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Số giờ dừng máy</label>
              <input type="number" min={0} step="0.5" className="w-full rounded-lg border px-3 py-2 text-sm" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Thiệt hại ước tính (đ)</label>
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={damageValue} onChange={(e) => setDamageValue(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Bên chịu trách nhiệm</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={responsibleParty} onChange={(e) => setResponsibleParty(e.target.value)} placeholder="VD: Tổ 3 — công nhân vận hành" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Biện pháp khắc phục, phòng ngừa</label>
            <textarea rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Thành phần tham gia lập biên bản</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={witnesses} onChange={(e) => setWitnesses(e.target.value)} placeholder="VD: Ông Nguyễn Văn A (Cơ điện), Bà Trần Thị B (Tổ trưởng)" />
          </div>

          <FileUpload label="Ảnh hiện trường" value={images} onChange={setImages} accept="image" max={6} />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : incident ? 'Cập nhật' : 'Lập biên bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
