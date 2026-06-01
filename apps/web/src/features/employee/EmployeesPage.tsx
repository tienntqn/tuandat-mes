import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useRestoreEmployee } from './employee.hooks'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { useFactories } from '@/features/factory/factory.hooks'
import { POSITION_LABELS, type Employee, type CreateEmployeeDto } from './employee.api'
import { useAuthStore } from '@/stores/auth.store'

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

  const { data: factoriesData } = useFactories({ status: 'ACTIVE', pageSize: 200 })
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Nhân viên</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} nhân viên</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Thêm nhân viên
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Tìm mã, tên, SĐT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterFactoryId ?? ''}
          onChange={(e) => { setFilterFactoryId(e.target.value ? +e.target.value : undefined); setPage(1) }}
        >
          <option value="">Tất cả xưởng</option>
          {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterPosition}
          onChange={(e) => { setFilterPosition(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả chức vụ</option>
          {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã NV</th>
              <th className="px-4 py-3 text-left font-medium">Họ tên</th>
              <th className="px-4 py-3 text-left font-medium">Chức vụ</th>
              <th className="px-4 py-3 text-left font-medium">Xưởng / Chuyền</th>
              <th className="px-4 py-3 text-left font-medium">Liên hệ</th>
              <th className="px-4 py-3 text-left font-medium">Tài khoản</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((emp) => (
                <tr key={emp.id} className={`border-t hover:bg-muted/20 ${emp.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{emp.code}</td>
                  <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {POSITION_LABELS[emp.position] ?? emp.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {emp.factory?.name && <div>{emp.factory.name}</div>}
                    {emp.line && <div className="text-muted-foreground">Chuyền {emp.line.lineNumber} — {emp.line.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {emp.phone && <div>{emp.phone}</div>}
                    {emp.email && <div>{emp.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {emp.user ? (
                      <span className={`text-xs rounded-full px-2 py-0.5 ${emp.user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {emp.user.username}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa có</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {emp.deletedAt ? (
                          <button onClick={() => restoreEmployee.mutate(emp.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget(emp); setFormOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(emp)} className="p-1.5 rounded hover:bg-accent text-destructive">
                              <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
