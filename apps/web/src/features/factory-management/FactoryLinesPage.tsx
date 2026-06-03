import { useState, useRef } from 'react'
import { useLines, useCreateLine, useUpdateLine, useDeleteLine, useRestoreLine } from '@/features/production-line/line.hooks'
import { useFactories } from '@/features/factory/factory.hooks'
import { LineFormDialog } from '@/features/production-line/LineFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { ProductionLine, CreateLineDto } from '@/features/production-line/line.api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from '@/lib/toast'

export default function FactoryLinesPage() {
  const [search, setSearch] = useState('')
  const [factoryFilter, setFactoryFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductionLine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionLine | null>(null)
  const [importing, setImporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('ADMIN')

  const { data: factoriesData, isError: factoriesError } = useFactories({ pageSize: 200 })
  const allFactories = factoriesData?.data ?? []
  // Cho dialog thêm/sửa: chỉ dùng xưởng ACTIVE
  const factories = allFactories.filter((f) => f.status === 'ACTIVE' && !f.deletedAt)

  const { data, isLoading, refetch } = useLines({
    search: search || undefined,
    factoryId: factoryFilter || undefined,
    page,
    pageSize,
  })
  const lines = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const createLine = useCreateLine()
  const updateLine = useUpdateLine()
  const deleteLine = useDeleteLine()
  const restoreLine = useRestoreLine()

  const handleSubmit = (dto: CreateLineDto) => {
    if (editTarget) {
      updateLine.mutate(
        { id: editTarget.id, dto },
        { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
      )
    } else {
      createLine.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = lines.map((l) => ({
      'Số chuyền': l.lineNumber,
      'Tên chuyền': l.name,
      'Xưởng (Code)': l.factory?.code ?? '',
      'Tên xưởng': l.factory?.name ?? '',
      'Số công nhân': l.workerCount,
      'Trạng thái': l.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Chuyền may')
    XLSX.writeFile(wb, 'chuyen-may.xlsx')
  }

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { 'Xưởng (Code)': 'X001', 'Tên chuyền': 'Chuyền May 1', 'Số công nhân': 10, 'Trạng thái': 'Hoạt động' },
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Chuyền may')
    XLSX.writeFile(wb, 'template-chuyen-may.xlsx')
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws)

      if (rows.length === 0) { toast.error('File không có dữ liệu'); return }

      // Map factory code → id
      const factoryMap = new Map(factories.map((f) => [f.code.trim().toLowerCase(), f.id]))

      let successCount = 0
      let errorCount = 0

      for (const row of rows) {
        const factoryCode = String(row['Xưởng (Code)'] ?? '').trim().toLowerCase()
        const name = String(row['Tên chuyền'] ?? '').trim()
        const workerCount = Number(row['Số công nhân'] ?? 10)
        const statusRaw = String(row['Trạng thái'] ?? '').trim()
        const status = statusRaw === 'Ngừng hoạt động' ? 'INACTIVE' : 'ACTIVE'

        const factoryId = factoryMap.get(factoryCode)
        if (!factoryId || !name) { errorCount++; continue }

        try {
          await createLine.mutateAsync({ factoryId, name, workerCount, status })
          successCount++
        } catch {
          errorCount++
        }
      }

      toast.success(`Đã nhập ${successCount} chuyền${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`)
      refetch()
    } catch {
      toast.error('Không thể đọc file Excel')
    } finally {
      setImporting(false)
    }
  }

  return (
    <PageWrapper
      title="Quản lý Chuyền may"
      breadcrumbs={[{ label: 'Quản lý nhà máy' }, { label: 'Chuyền may' }]}
      actions={
        <div className="d-flex gap-2">
          {canWrite && (
            <>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleDownloadTemplate}
                title="Tải file mẫu Excel"
              >
                <i className="fe fe-download me-1"></i> Mẫu Excel
              </button>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                title="Import từ Excel"
              >
                {importing
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang nhập...</>
                  : <><i className="fe fe-upload me-1"></i> Import Excel</>}
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="d-none" onChange={handleImportExcel} />
            </>
          )}
          <button
            className="btn btn-outline-info btn-sm"
            onClick={handleExportExcel}
            title="Xuất Excel"
          >
            <i className="fe fe-file-text me-1"></i> Xuất Excel
          </button>
          {canWrite && (
            <button
              className="btn btn-primary btn-sm text-white"
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
            >
              <i className="fe fe-plus me-1"></i> Thêm chuyền
            </button>
          )}
        </div>
      }
    >
      {/* Bộ lọc */}
      <div className="row mb-3 g-2">
        <div className="col-auto">
          <div className="input-group input-group-sm">
            <input
              className="form-control"
              placeholder="Tìm tên chuyền..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className={`form-select form-select-sm${factoriesError ? ' border-danger' : ''}`}
            value={factoryFilter}
            onChange={(e) => { setFactoryFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
            title={factoriesError ? 'Không tải được danh sách xưởng' : undefined}
          >
            <option value="">{factoriesError ? '⚠ Lỗi tải xưởng' : 'Tất cả xưởng'}</option>
            {allFactories.map((f) => (
              <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
            ))}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{total} chuyền</small>
        </div>
        <div className="col-auto ms-auto">
          <button className="btn btn-outline-secondary btn-sm btn-icon" onClick={() => refetch()} title="Làm mới">
            <i className="fe fe-rotate-ccw"></i>
          </button>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center text-muted py-5">
              <span className="spinner-border me-2"></span>Đang tải...
            </div>
          ) : lines.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="fe fe-inbox d-block mb-2" style={{ fontSize: 40, opacity: 0.3 }}></i>
              <p>Không tìm thấy chuyền nào</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-vcenter mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: 100 }}>Số chuyền</th>
                    <th>Tên chuyền</th>
                    <th>Xưởng may</th>
                    <th style={{ width: 140 }}>Số công nhân</th>
                    <th style={{ width: 140 }}>Trạng thái</th>
                    {canWrite && <th className="text-end" style={{ width: 120 }}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className={line.deletedAt ? 'opacity-50' : ''}>
                      <td>
                        <span className={`badge ${line.deletedAt ? 'bg-secondary-transparent text-secondary' : 'bg-primary-transparent text-primary'}`}>
                          Chuyền {line.lineNumber}
                        </span>
                      </td>
                      <td>
                        {line.deletedAt
                          ? <><span className="text-decoration-line-through">{line.name}</span> <span className="badge bg-danger-transparent text-danger ms-1">Đã xóa</span></>
                          : line.name}
                      </td>
                      <td>
                        {line.factory
                          ? <><code className="text-primary me-1">{line.factory.code}</code>{line.factory.name}</>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-muted">
                        {line.workerCount > 0 ? `${line.workerCount.toLocaleString('vi-VN')} người` : '—'}
                      </td>
                      <td>
                        {line.deletedAt ? '—' : <StatusBadge status={line.status} />}
                      </td>
                      {canWrite && (
                        <td className="text-end">
                          {line.deletedAt ? (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => restoreLine.mutate(line.id)}
                              title="Khôi phục"
                            >
                              <i className="fe fe-rotate-ccw"></i>
                            </button>
                          ) : (
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => { setEditTarget(line); setFormOpen(true) }}
                                title="Chỉnh sửa"
                              >
                                <i className="fe fe-edit-2"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeleteTarget(line)}
                                title="Xóa"
                              >
                                <i className="fe fe-trash-2"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between">
            <small className="text-muted">Trang {page}/{totalPages} — {total} chuyền</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <i className="fe fe-chevron-left"></i>
              </button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <i className="fe fe-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <LineFormDialog
        open={formOpen}
        line={editTarget}
        factories={factories}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createLine.isPending || updateLine.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa chuyền"
        description={`Bạn có chắc muốn xóa chuyền "${deleteTarget?.name}"? Hành động này có thể khôi phục.`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteLine.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteLine.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
