import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useIncidents, useCreateIncident, useUpdateIncident, useDeleteIncident } from './mmtb-ops.hooks'
import type { IncidentReport } from './breakdown.api'
import { IncidentFormDialog } from './IncidentFormDialog'
import { IncidentPrint } from './IncidentPrint'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('vi-VN') : '—')

export default function IncidentReportsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<IncidentReport | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IncidentReport | null>(null)
  const [printTarget, setPrintTarget] = useState<IncidentReport | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  const canDelete = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data, isLoading, refetch } = useIncidents({ search: search || undefined, page, pageSize: 20 })
  const createIncident = useCreateIncident()
  const updateIncident = useUpdateIncident()
  const deleteIncident = useDeleteIncident()

  return (
    <PageWrapper
      title="Biên bản sự cố"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Biên bản sự cố' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Lập biên bản
            </button>
          )}
        </div>
      }
    >
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm số biên bản, mã máy, nội dung..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center"><small className="text-muted">{data?.total ?? 0} biên bản</small></div>
      </div>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Số biên bản</th><th>Máy</th><th>Diễn biến</th><th>Nguyên nhân</th>
              <th className="text-center">Dừng máy</th><th className="text-end">Thiệt hại</th>
              <th className="text-center">Thời điểm</th><th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có biên bản sự cố nào</td></tr>
            ) : (
              data?.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code>{c.incidentNo}</code>
                    {c.breakdownReport && <div className="small text-muted">BH: {c.breakdownReport.reportNo}</div>}
                  </td>
                  <td>
                    <div className="fw-medium">{c.machine?.code}</div>
                    <div className="small text-muted">{c.machine?.name}</div>
                  </td>
                  <td style={{ maxWidth: 220 }} className="small">{c.description}</td>
                  <td style={{ maxWidth: 180 }} className="small text-muted">{c.cause ?? '—'}</td>
                  <td className="text-center small">{c.downtimeHours != null ? `${Number(c.downtimeHours)}h` : '—'}</td>
                  <td className="text-end small">{c.damageValue != null ? Number(c.damageValue).toLocaleString('vi-VN') : '—'}</td>
                  <td className="text-center small">{fmtDateTime(c.incidentDate)}</td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      <button onClick={() => setPrintTarget(c)} className="btn btn-sm btn-outline-secondary" title="In biên bản"><Printer size={13} /></button>
                      {canWrite && (
                        <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary"><i className="fe fe-edit-2"></i></button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteTarget(c)} className="btn btn-sm btn-outline-danger"><i className="fe fe-trash-2"></i></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <IncidentFormDialog
        open={formOpen}
        incident={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={(dto) => {
          if (editTarget) {
            const { machineId, ...rest } = dto
            void machineId
            updateIncident.mutate({ id: editTarget.id, dto: rest }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
          } else {
            createIncident.mutate(dto, { onSuccess: () => setFormOpen(false) })
          }
        }}
        isPending={createIncident.isPending || updateIncident.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa biên bản sự cố"
        description={`Xóa biên bản ${deleteTarget?.incidentNo}?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteIncident.isPending}
        onConfirm={() => deleteTarget && deleteIncident.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />

      {printTarget && <IncidentPrint incident={printTarget} onClose={() => setPrintTarget(null)} />}
    </PageWrapper>
  )
}
