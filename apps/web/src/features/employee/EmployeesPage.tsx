import { useState } from 'react'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useRestoreEmployee } from './employee.hooks'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'
import { cellStr } from '@/lib/excel'
import { useFactories } from '@/features/factory/factory.hooks'
import { employeeApi, POSITION_LABELS, type Employee, type CreateEmployeeDto } from './employee.api'
import { useRoles, useCreateUser } from '@/features/users/users.hooks'
import { suggestUsername } from '@/features/users/username'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth.store'

const DEFAULT_USER_PASSWORD = '123456@'

const POSITION_BY_LABEL = Object.fromEntries(Object.entries(POSITION_LABELS).map(([k, v]) => [v, k]))

export default function EmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterFactoryId, setFilterFactoryId] = useState<number | undefined>()
  const [filterPosition, setFilterPosition] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD')
  const canCreateUser = isAdmin()

  const { data: roles } = useRoles()
  const createUser = useCreateUser()

  // Tạo nhanh tài khoản cho nhân viên: username = mã NV (viết thường), mật khẩu mặc định, vai trò trùng chức danh
  const handleCreateUser = (emp: Employee) => {
    const role = roles?.find((r) => r.name === emp.position)
    const username = suggestUsername(emp)
    createUser.mutate(
      { employeeId: emp.id, username, password: DEFAULT_USER_PASSWORD, roleIds: role ? [role.id] : [] },
      {
        onSuccess: () => { toast.success(`Đã tạo tài khoản "${username}" — mật khẩu ${DEFAULT_USER_PASSWORD}`); refetch() },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể tạo tài khoản'),
      },
    )
  }

  const { data: factoriesData } = useFactories({ pageSize: 200 })
  const factories = factoriesData?.data ?? []

  const params = {
    search: search || undefined,
    factoryId: filterFactoryId,
    position: filterPosition || undefined,
    page,
    pageSize: 20,
  }
  const { data, isLoading, refetch } = useEmployees(params)
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()
  const restoreEmployee = useRestoreEmployee()

  const handleSubmit = (dto: CreateEmployeeDto) => {
    if (editTarget) {
      updateEmployee.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createEmployee.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const exportRows = () => (data?.data ?? []).map((emp) => ({
    'Mã NV': emp.code,
    'Họ tên': emp.fullName,
    'Chức vụ': POSITION_LABELS[emp.position] ?? emp.position,
    'Mã xưởng': emp.factory?.code ?? '',
    'SĐT': emp.phone ?? '',
    'Email': emp.email ?? '',
  }))

  const templateRows = [
    { 'Mã NV': '', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'GĐ Xưởng', 'Mã xưởng': 'XW001', 'SĐT': '0900000000', 'Email': '' },
  ]

  const handleImportRows = async (rows: Record<string, string | number>[]) => {
    const factoryMap = new Map(factories.map((f) => [f.code.trim().toLowerCase(), f.id]))
    let success = 0
    let error = 0
    for (const row of rows) {
      const fullName = cellStr(row['Họ tên'])
      const position = POSITION_BY_LABEL[cellStr(row['Chức vụ'])]
      if (!fullName || !position) { error++; continue }
      const factoryId = factoryMap.get(cellStr(row['Mã xưởng']).toLowerCase())
      try {
        await employeeApi.create({
          code: cellStr(row['Mã NV']) || undefined,
          fullName,
          position,
          factoryId: factoryId ?? undefined,
          phone: cellStr(row['SĐT']) || undefined,
          email: cellStr(row['Email']) || undefined,
        })
        success++
      } catch { error++ }
    }
    refetch()
    return { success, error }
  }

  return (
    <PageWrapper
      title="Danh sách Nhân viên"
      breadcrumbs={[{ label: 'Quản lý User' }, { label: 'Nhân viên' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span>
          </button>
          <ExcelToolbar
            sheetName="Nhân viên"
            fileBase="nhan-vien"
            exportRows={exportRows}
            templateRows={templateRows}
            onImport={canWrite ? handleImportRows : undefined}
            canWrite={canWrite}
            entityLabel="nhân viên"
          />
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="btn btn-primary btn-icon text-white"
            >
              <span><i className="fe fe-plus"></i></span> Thêm nhân viên
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
              placeholder="Tìm mã, tên, SĐT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={filterFactoryId ?? ''}
            onChange={(e) => { setFilterFactoryId(e.target.value ? +e.target.value : undefined); setPage(1) }}
          >
            <option value="">Tất cả xưởng</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={filterPosition}
            onChange={(e) => { setFilterPosition(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả chức vụ</option>
            {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{data?.total ?? 0} nhân viên</small>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Chức vụ</th>
                  <th>Xưởng / Chuyền</th>
                  <th>Liên hệ</th>
                  <th>Tài khoản</th>
                  {canWrite && <th className="text-end">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  data?.data.map((emp) => (
                    <tr key={emp.id} className={emp.deletedAt ? 'opacity-50' : ''}>
                      <td><code>{emp.code}</code></td>
                      <td className="fw-medium">{emp.fullName}</td>
                      <td>
                        <span className="badge bg-secondary-transparent">
                          {POSITION_LABELS[emp.position] ?? emp.position}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {emp.factory?.name && <div>{emp.factory.name}</div>}
                        {emp.line && <div>Chuyền {emp.line.lineNumber} — {emp.line.name}</div>}
                      </td>
                      <td className="text-muted small">
                        {emp.phone && <div>{emp.phone}</div>}
                        {emp.email && <div>{emp.email}</div>}
                      </td>
                      <td>
                        {emp.user ? (
                          <span className={`badge ${emp.user.isActive ? 'bg-success-transparent text-success' : 'bg-danger-transparent text-danger'}`}>
                            {emp.user.username}
                          </span>
                        ) : (
                          <span className="text-muted small">Chưa có</span>
                        )}
                      </td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {emp.deletedAt ? (
                              <button onClick={() => restoreEmployee.mutate(emp.id)} className="btn btn-sm btn-outline-secondary">
                                <i className="fe fe-rotate-ccw"></i>
                              </button>
                            ) : (
                              <>
                                {canCreateUser && !emp.user && (
                                  <button
                                    onClick={() => handleCreateUser(emp)}
                                    disabled={createUser.isPending}
                                    title={`Tạo tài khoản (mật khẩu ${DEFAULT_USER_PASSWORD})`}
                                    className="btn btn-sm btn-outline-primary"
                                  >
                                    <i className="fe fe-user-plus"></i>
                                  </button>
                                )}
                                <button onClick={() => { setEditTarget(emp); setFormOpen(true) }} className="btn btn-sm btn-outline-secondary">
                                  <i className="fe fe-edit-2"></i>
                                </button>
                                <button onClick={() => setDeleteTarget(emp)} className="btn btn-sm btn-outline-danger">
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

      <EmployeeFormDialog
        open={formOpen}
        employee={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createEmployee.isPending || updateEmployee.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa nhân viên"
        description={`Bạn có chắc muốn xóa nhân viên "${deleteTarget?.fullName}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteEmployee.isPending}
        onConfirm={() => deleteTarget && deleteEmployee.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
