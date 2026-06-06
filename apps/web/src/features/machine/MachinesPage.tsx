import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine } from './machine.hooks'
import { MachineFormDialog } from './MachineFormDialog'
import { MachineQrPrintModal } from './MachineQrPrintModal'
import { useAppSettings } from '@/features/settings/settings.hooks'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellDate } from '@/lib/excel'
import type { Machine, CreateMachineDto, MachineType, MachineStatus } from './machine.api'
import { MACHINE_TYPE_LABELS, MACHINE_STATUS_LABELS, machineApi } from './machine.api'
import { useAuthStore } from '@/stores/auth.store'

const TYPE_BY_LABEL = Object.fromEntries(Object.entries(MACHINE_TYPE_LABELS).map(([k, v]) => [v, k]))
const MACHINE_STATUS_BY_LABEL = Object.fromEntries(Object.entries(MACHINE_STATUS_LABELS).map(([k, v]) => [v, k]))
import { factoryApi } from '@/features/factory/factory.api'
import { useQuery } from '@tanstack/react-query'
import { lineApi } from '@/features/production-line/line.api'

export default function MachinesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterFactoryId, setFilterFactoryId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Machine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null)
  const [qrTarget, setQrTarget] = useState<Machine | null>(null)
  const { data: appSettings } = useAppSettings()

  const { isAdmin, hasRole, isCompanyLevel } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')
  // Cơ điện được sửa máy nhưng KHÔNG được thêm máy mới (chỉ ADMIN/BOD/GĐ xưởng)
  const canCreate = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')
  // Chỉ user cấp công ty mới cần lọc theo xưởng (user cấp xưởng chỉ có 1 xưởng)
  const showFactoryFilter = isCompanyLevel()

  const params = {
    search: search || undefined,
    status: filterStatus as MachineStatus || undefined,
    type: filterType as MachineType || undefined,
    factoryId: filterFactoryId ? Number(filterFactoryId) : undefined,
    page,
    pageSize: 20,
  }

  const { data, isLoading, refetch } = useMachines(params)
  const { data: factories } = useQuery({ queryKey: ['factories-all'], queryFn: () => factoryApi.list({ pageSize: 100 }) })
  const { data: linesData } = useQuery({ queryKey: ['lines-all'], queryFn: () => lineApi.list({ pageSize: 200 }) })

  const createMachine = useCreateMachine()
  const updateMachine = useUpdateMachine()
  const deleteMachine = useDeleteMachine()

  const handleSubmit = (dto: CreateMachineDto) => {
    if (editTarget) {
      updateMachine.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createMachine.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMachine.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  const factoryList = factories?.data ?? []
  const lineList = (linesData?.data ?? []).map((l: any) => ({ id: l.id, name: l.name, lineNumber: l.lineNumber, factoryId: l.factoryId }))

  const exportRows = () => (data?.data ?? []).map((m) => ({
    'Mã máy': m.code,
    'Tên máy': m.name,
    'Loại': MACHINE_TYPE_LABELS[m.type] ?? m.type,
    'Mã xưởng': m.factory?.code ?? '',
    'Trạng thái': MACHINE_STATUS_LABELS[m.status] ?? m.status,
    'Hãng': m.brand ?? '',
    'Model': m.model ?? '',
    'Ngày mua': m.purchaseDate ? m.purchaseDate.split('T')[0] : '',
    'Ghi chú': m.note ?? '',
  }))

  const templateRows = [
    { 'Mã máy': '', 'Tên máy': 'Máy may 1 kim', 'Loại': 'Máy may', 'Mã xưởng': 'XW001', 'Trạng thái': 'Chờ', 'Hãng': 'Juki', 'Model': 'DDL-8700', 'Ngày mua': '2025-01-15', 'Ghi chú': '' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const factoryMap = new Map(factoryList.map((f) => [f.code.trim().toLowerCase(), f.id]))
    let success = 0
    let error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên máy'])
      const type = TYPE_BY_LABEL[cellStr(row['Loại'])] as MachineType | undefined
      const factoryId = factoryMap.get(cellStr(row['Mã xưởng']).toLowerCase())
      if (!name || !type || !factoryId) { error++; continue }
      const purchaseDate = cellDate(row['Ngày mua'])
      try {
        await machineApi.create({
          code: cellStr(row['Mã máy']) || undefined,
          name,
          type,
          factoryId,
          status: (MACHINE_STATUS_BY_LABEL[cellStr(row['Trạng thái'])] as MachineStatus) || undefined,
          brand: cellStr(row['Hãng']) || undefined,
          model: cellStr(row['Model']) || undefined,
          purchaseDate: purchaseDate || undefined,
          note: cellStr(row['Ghi chú']) || undefined,
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh sách Máy móc"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Danh sách máy' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Máy móc"
            fileBase="may-moc"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canCreate ? handleImportRows : undefined}
            canWrite={canCreate}
            entityLabel="máy"
          />
          {canCreate && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Thêm máy
            </button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-12 col-sm">
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tìm mã, tên máy, hãng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        {showFactoryFilter && (
          <div className="col-6 col-sm-auto">
            <select
              className="form-select"
              value={filterFactoryId}
              onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
            >
              <option value="">Tất cả xưởng</option>
              {factoryList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        <div className="col-6 col-sm-auto">
          <select
            className="form-select"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả loại</option>
            {(Object.entries(MACHINE_TYPE_LABELS) as [MachineType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-sm-auto">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả trạng thái</option>
            {(Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} máy</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã</th>
                  <th>Tên máy</th>
                  <th>Loại</th>
                  <th>Xưởng</th>
                  <th>Chuyền</th>
                  <th>Hãng / Model</th>
                  <th>Trạng thái</th>
                  <th>Hạn BD tiếp</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((machine) => {
                    const nextDue = machine.maintenances?.[0]?.nextDueDate
                    const isOverdue = nextDue && new Date(nextDue) < new Date()
                    return (
                      <tr key={machine.id}>
                        <td><Link to={`/machines/${machine.id}`} className="text-decoration-none"><code>{machine.code}</code></Link></td>
                        <td className="fw-medium"><Link to={`/machines/${machine.id}`} className="text-reset text-decoration-none">{machine.name}</Link></td>
                        <td className="text-muted">{MACHINE_TYPE_LABELS[machine.type]}</td>
                        <td>{machine.factory?.name ?? '—'}</td>
                        <td className="text-muted">
                          {machine.line ? `Chuyền ${machine.line.lineNumber}` : <span className="text-muted opacity-60">Chưa gán</span>}
                        </td>
                        <td className="text-muted small">
                          {[machine.brand, machine.model].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td><MachineStatusBadge status={machine.status} /></td>
                        <td className="small">
                          {nextDue ? (
                            <span className={isOverdue ? 'text-danger fw-medium' : 'text-warning fw-medium'}>
                              {isOverdue ? '⚠ ' : ''}{new Date(nextDue).toLocaleDateString('vi-VN')}
                            </span>
                          ) : (
                            <span className="text-muted opacity-60">—</span>
                          )}
                        </td>
                        {canWrite && (
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                onClick={() => setQrTarget(machine)}
                                title="In tem QR"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="fe fe-printer"></i>
                              </button>
                              <button
                                onClick={() => { setEditTarget(machine); setFormOpen(true) }}
                                title="Chỉnh sửa"
                                className="btn btn-sm btn-outline-secondary"
                              >
                                <i className="fe fe-edit-2"></i>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(machine)}
                                title="Xóa"
                                className="btn btn-sm btn-outline-danger"
                              >
                                <i className="fe fe-trash-2"></i>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
      )}

      <MachineFormDialog
        open={formOpen}
        machine={editTarget}
        factories={factoryList}
        lines={lineList}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createMachine.isPending || updateMachine.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa máy"
        description={`Bạn có chắc muốn xóa máy "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteMachine.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {qrTarget && (
        <MachineQrPrintModal
          machine={qrTarget}
          printerName={appSettings?.qrPrinterName}
          widthMm={appSettings?.qrLabelWidthMm}
          heightMm={appSettings?.qrLabelHeightMm}
          onClose={() => setQrTarget(null)}
        />
      )}
    </PageWrapper>
  )
}

function MachineStatusBadge({ status }: { status: MachineStatus }) {
  const colorMap: Record<MachineStatus, string> = {
    RUNNING: 'bg-success-transparent text-success',
    IDLE: 'bg-secondary-transparent text-secondary',
    MAINTENANCE: 'bg-primary-transparent text-primary',
    BROKEN: 'bg-danger-transparent text-danger',
    STOPPED: 'bg-warning-transparent text-warning',
  }
  return (
    <span className={`badge ${colorMap[status]}`}>
      {MACHINE_STATUS_LABELS[status]}
    </span>
  )
}
