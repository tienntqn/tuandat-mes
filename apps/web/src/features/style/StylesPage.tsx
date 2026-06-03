import { useState } from 'react'
import { useStyles, useCreateStyle, useUpdateStyle, useDeleteStyle, useRestoreStyle } from './style.hooks'
import { StyleFormDialog } from './StyleFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr, cellNum } from '@/lib/excel'
import { useCustomersActive } from '@/features/customer/customer.hooks'
import { styleApi, type Style, type CreateStyleDto } from './style.api'
import { useAuthStore } from '@/stores/auth.store'

export default function StylesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState<number | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Style | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Style | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data: customers = [] } = useCustomersActive()
  const { data, isLoading, refetch } = useStyles({ search: search || undefined, customerId: filterCustomerId, page, pageSize: 20 })
  const createStyle = useCreateStyle()
  const updateStyle = useUpdateStyle()
  const deleteStyle = useDeleteStyle()
  const restoreStyle = useRestoreStyle()

  const handleSubmit = (dto: CreateStyleDto) => {
    if (editTarget) {
      updateStyle.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createStyle.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const exportRows = () => (data?.data ?? []).map((s) => ({
    'Mã hàng': s.code,
    'Tên': s.name,
    'Mã KH': s.customer?.code ?? '',
    'Khách hàng': s.customer?.name ?? '',
    'Mùa vụ': s.season ?? '',
    'SAM (phút)': s.sam ?? '',
    'Mô tả': s.description ?? '',
  }))

  const templateRows = [
    { 'Mã hàng': '', 'Tên': 'Áo thun cơ bản', 'Mã KH': 'KH001', 'Mùa vụ': 'SS25', 'SAM (phút)': 12.5, 'Mô tả': '' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const customerMap = new Map(customers.map((c) => [c.code.trim().toLowerCase(), c.id]))
    let success = 0
    let error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên'])
      const customerId = customerMap.get(cellStr(row['Mã KH']).toLowerCase())
      if (!name || !customerId) { error++; continue }
      const samRaw = cellStr(row['SAM (phút)'])
      try {
        await styleApi.create({
          code: cellStr(row['Mã hàng']) || undefined,
          name,
          customerId,
          season: cellStr(row['Mùa vụ']) || undefined,
          description: cellStr(row['Mô tả']) || undefined,
          sam: samRaw ? cellNum(samRaw) : undefined,
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh sách Mã hàng"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Danh mục' }, { label: 'Mã hàng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Mã hàng"
            fileBase="ma-hang"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="mã hàng"
          />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm mã hàng
            </button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tìm mã, tên..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={filterCustomerId ?? ''}
            onChange={(e) => { setFilterCustomerId(e.target.value ? +e.target.value : undefined); setPage(1) }}
          >
            <option value="">Tất cả khách hàng</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} mã hàng</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên</th>
                  <th>Khách hàng</th>
                  <th>Mùa vụ</th>
                  <th>SAM</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((s) => (
                    <tr key={s.id} className={s.deletedAt ? 'opacity-50' : ''}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {s.image && <img src={s.image} className="rounded" style={{ width: 32, height: 32, objectFit: 'cover' }} alt="" />}
                          <code>{s.code}</code>
                        </div>
                      </td>
                      <td className="fw-medium">{s.name}</td>
                      <td className="text-muted">{s.customer?.name ?? '—'}</td>
                      <td className="text-muted">{s.season || '—'}</td>
                      <td>{s.sam ? `${s.sam} phút` : '—'}</td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {s.deletedAt ? (
                              <button onClick={() => restoreStyle.mutate(s.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(s); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(s)} className="btn btn-sm btn-outline-danger">
                                  <i className="fe fe-trash-2"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}

      <StyleFormDialog open={formOpen} style={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createStyle.isPending || updateStyle.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa mã hàng"
        description={`Bạn có chắc muốn xóa mã hàng "${deleteTarget?.code}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteStyle.isPending}
        onConfirm={() => deleteTarget && deleteStyle.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
