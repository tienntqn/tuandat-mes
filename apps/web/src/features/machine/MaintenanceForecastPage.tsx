import { useState, useMemo } from 'react'
import { CalendarPlus, AlertTriangle } from 'lucide-react'
import { useMaintenanceForecast, useCreateWorkPlan } from './maintenance-plan.hooks'
import type { WorkPlanItemInput } from './maintenance-plan.api'
import { WorkPlanFormDialog } from './WorkPlanFormDialog'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

/**
 * Dự tính kế hoạch bảo dưỡng: hệ thống tính ngày đến hạn từ định mức bảo dưỡng
 * và lần bảo dưỡng gần nhất, cho phép chọn nhiều máy để lập ngay thành kế hoạch.
 */
export default function MaintenanceForecastPage() {
  const [daysAhead, setDaysAhead] = useState(30)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [planOpen, setPlanOpen] = useState(false)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const { data: rows = [], isLoading, refetch } = useMaintenanceForecast({ daysAhead })
  const createPlan = useCreateWorkPlan()

  const overdueCount = rows.filter((r) => r.isOverdue).length
  const noNormCount = rows.filter((r) => !r.norm).length

  const toggle = (machineId: number) => {
    const next = new Set(selected)
    if (next.has(machineId)) next.delete(machineId)
    else next.add(machineId)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.machineId)))
  }

  // Chuyển các dòng đã chọn thành dòng công việc của kế hoạch
  const initialItems = useMemo<WorkPlanItemInput[]>(
    () =>
      rows
        .filter((r) => selected.has(r.machineId))
        .map((r) => ({
          machineId: r.machineId,
          normId: r.norm?.id,
          plannedDate: (r.dueDate ?? new Date().toISOString()).slice(0, 10),
          content: r.norm ? r.norm.name : 'Bảo dưỡng định kỳ',
          estimatedCost: r.norm?.estimatedCost != null ? Number(r.norm.estimatedCost) : undefined,
        })),
    [rows, selected],
  )

  const exportRows = () =>
    rows.map((r) => ({
      'Mã máy': r.machineCode,
      'Tên máy': r.machineName,
      'Xưởng': r.factory?.name ?? '',
      'Chuyền': r.line?.name ?? '',
      'Chủng loại': r.category?.name ?? '',
      'Định mức': r.norm?.name ?? '',
      'Chu kỳ (ngày)': r.norm?.intervalDays ?? '',
      'BD lần cuối': fmtDate(r.lastMaintenanceDate),
      'Đến hạn': fmtDate(r.dueDate),
      'Còn (ngày)': r.daysUntilDue ?? '',
      'Chi phí DK': r.norm?.estimatedCost != null ? Number(r.norm.estimatedCost) : '',
    }))

  return (
    <PageWrapper
      title="Dự tính kế hoạch bảo dưỡng"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Dự tính bảo dưỡng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Dự tính bảo dưỡng" fileBase="du-tinh-bao-duong" exportRows={exportRows} templateRows={exportRows()} canWrite={false} entityLabel="dòng dự tính" />
          {canWrite && (
            <button onClick={() => setPlanOpen(true)} disabled={selected.size === 0} className="btn btn-primary btn-icon text-white">
              <span><CalendarPlus size={15} /></span> Lập kế hoạch ({selected.size})
            </button>
          )}
        </div>
      }
    >
      <div className="alert alert-info small">
        Ngày đến hạn được tính từ <strong>định mức bảo dưỡng</strong> (chu kỳ) và <strong>lần bảo dưỡng gần nhất</strong>.
        Máy chưa từng bảo dưỡng thì tính từ ngày mua. Chọn các máy cần làm rồi bấm "Lập kế hoạch".
      </div>

      {overdueCount > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> Có <strong>{overdueCount}</strong> máy đã quá hạn bảo dưỡng.
        </div>
      )}
      {noNormCount > 0 && (
        <div className="alert alert-warning small">
          {noNormCount} máy trong danh sách chưa có định mức bảo dưỡng — hãy khai báo định mức để dự tính chính xác hơn.
        </div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select" value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))}>
            <option value={7}>Đến hạn trong 7 ngày</option>
            <option value={30}>Đến hạn trong 30 ngày</option>
            <option value={60}>Đến hạn trong 60 ngày</option>
            <option value={90}>Đến hạn trong 90 ngày</option>
          </select>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{rows.length} máy</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" className="form-check-input" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              </th>
              <th>Máy</th><th>Chuyền</th><th>Định mức bảo dưỡng</th>
              <th className="text-center">Chu kỳ</th><th className="text-center">BD lần cuối</th>
              <th className="text-center">Đến hạn</th><th className="text-end">Chi phí DK</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Không có máy nào đến hạn trong khoảng thời gian này</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.machineId} className={r.isOverdue ? 'table-danger' : ''}>
                  <td>
                    <input type="checkbox" className="form-check-input" checked={selected.has(r.machineId)} onChange={() => toggle(r.machineId)} />
                  </td>
                  <td>
                    <div className="fw-medium">{r.machineCode}</div>
                    <div className="small text-muted">{r.machineName}</div>
                  </td>
                  <td className="small text-muted">{r.line?.name ?? '—'}</td>
                  <td className="small">
                    {r.norm ? (
                      <>
                        <div>{r.norm.name}</div>
                        {r.norm.items.length > 0 && (
                          <div className="text-muted">{r.norm.items.length} loại vật tư định mức</div>
                        )}
                      </>
                    ) : (
                      <span className="text-warning">Chưa có định mức</span>
                    )}
                  </td>
                  <td className="text-center small">{r.norm ? `${r.norm.intervalDays} ngày` : '—'}</td>
                  <td className="text-center small">{fmtDate(r.lastMaintenanceDate)}</td>
                  <td className="text-center small">
                    {fmtDate(r.dueDate)}
                    {r.isOverdue ? (
                      <div><span className="badge bg-danger-transparent">Quá hạn {Math.abs(r.daysUntilDue ?? 0)} ngày</span></div>
                    ) : (
                      <div><span className="badge bg-warning-transparent">Còn {r.daysUntilDue} ngày</span></div>
                    )}
                  </td>
                  <td className="text-end small">
                    {r.norm?.estimatedCost != null ? Number(r.norm.estimatedCost).toLocaleString('vi-VN') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      <WorkPlanFormDialog
        open={planOpen}
        defaultType="MAINTENANCE"
        initialItems={initialItems}
        onClose={() => setPlanOpen(false)}
        onSubmit={(dto) => createPlan.mutate(dto, { onSuccess: () => { setPlanOpen(false); setSelected(new Set()) } })}
        isPending={createPlan.isPending}
      />
    </PageWrapper>
  )
}
