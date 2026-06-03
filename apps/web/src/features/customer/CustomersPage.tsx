import { useState } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useRestoreCustomer } from './customer.hooks'
import { CustomerFormDialog } from './CustomerFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { customerApi, type Customer, type CreateCustomerDto } from './customer.api'
import { useAuthStore } from '@/stores/auth.store'

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')

  const { data, isLoading, refetch } = useCustomers({ search: search || undefined, page, pageSize: 20 })
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const restoreCustomer = useRestoreCustomer()

  const handleSubmit = (dto: CreateCustomerDto) => {
    if (editTarget) {
      updateCustomer.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createCustomer.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const exportRows = () => (data?.data ?? []).map((c) => ({
    'Mã': c.code,
    'Tên khách hàng': c.name,
    'Quốc gia': c.country ?? '',
    'Thông tin liên hệ': c.contactInfo ?? '',
  }))

  const templateRows = [
    { 'Mã': '', 'Tên khách hàng': 'Công ty ABC', 'Quốc gia': 'Việt Nam', 'Thông tin liên hệ': 'email@abc.com' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    let success = 0
    let error = 0
    for (const row of rows) {
      const name = cellStr(row['Tên khách hàng'])
      if (!name) { error++; continue }
      try {
        await customerApi.create({
          code: cellStr(row['Mã']) || undefined,
          name,
          country: cellStr(row['Quốc gia']) || undefined,
          contactInfo: cellStr(row['Thông tin liên hệ']) || undefined,
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh sách Khách hàng"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Danh mục' }, { label: 'Khách hàng' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Khách hàng"
            fileBase="khach-hang"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="khách hàng"
          />
          {canWrite && (
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="btn btn-primary btn-icon text-white">
              <span><i className="fe fe-plus"></i></span> Thêm khách hàng
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
              placeholder="Tìm mã, tên, quốc gia..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} khách hàng</small>
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
                  <th>Tên khách hàng</th>
                  <th>Quốc gia</th>
                  <th>Thông tin liên hệ</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((c) => (
                    <tr key={c.id} className={c.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{c.code}</code></td>
                      <td className="fw-medium">{c.name}</td>
                      <td className="text-muted">{c.country || '—'}</td>
                      <td className="text-muted" style={{ maxWidth: 200 }}>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: 200 }}>{c.contactInfo || '—'}</span>
                      </td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {c.deletedAt ? (
                              <button onClick={() => restoreCustomer.mutate(c.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget(c); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(c)} className="btn btn-sm btn-outline-danger">
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

      <CustomerFormDialog open={formOpen} customer={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSubmit={handleSubmit} isPending={createCustomer.isPending || updateCustomer.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa khách hàng"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteCustomer.isPending}
        onConfirm={() => deleteTarget && deleteCustomer.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
