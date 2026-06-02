import { useState } from 'react'
import { useUsers, useRoles, useUpdateUser, useResetPassword } from './users.hooks'
import { CreateUserDialog } from './CreateUserDialog'
import { EditRolesDialog } from './EditRolesDialog'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { UserListItem } from './users.api'

const POSITION_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  BOD: 'Ban Giám đốc',
  COMPANY_PLANNER: 'KH Công ty',
  FACTORY_DIRECTOR: 'GĐ Xưởng',
  FACTORY_PLANNER: 'KH Xưởng',
  LINE_LEADER: 'Tổ trưởng',
  LINE_DEPUTY: 'Tổ phó',
  MECHANIC: 'Cơ điện',
}

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRolesUser, setEditRolesUser] = useState<UserListItem | null>(null)
  const [resetUser, setResetUser] = useState<UserListItem | null>(null)
  const [newPw, setNewPw] = useState('')

  const { data, isLoading, refetch } = useUsers(page)
  const updateUser = useUpdateUser()
  const resetPw = useResetPassword()

  const toggleActive = (user: UserListItem) =>
    updateUser.mutate({ id: user.id, data: { isActive: !user.isActive } })

  const handleResetPw = () => {
    if (!resetUser || newPw.length < 6) return
    resetPw.mutate(
      { id: resetUser.id, newPassword: newPw },
      { onSuccess: () => { setResetUser(null); setNewPw('') } },
    )
  }

  return (
    <PageWrapper
      title="Quản lý Tài khoản"
      breadcrumbs={[{ label: 'Hệ thống' }, { label: 'Tài khoản' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
            <span><i className="fe fe-rotate-ccw"></i></span> Làm mới
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn btn-primary btn-icon text-white"
          >
            <span><i className="fe fe-plus"></i></span> Tạo tài khoản
          </button>
        </div>
      }
    >
      <p className="text-muted mb-3">{data?.total ?? 0} tài khoản</p>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Nhân viên</th>
                  <th>Tài khoản</th>
                  <th>Chức danh</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">Đang tải...</td>
                  </tr>
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">Chưa có tài khoản nào</td>
                  </tr>
                ) : (
                  data?.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <p className="fw-medium mb-0">{user.employee.fullName}</p>
                        <small className="text-muted">{user.employee.code}</small>
                      </td>
                      <td className="font-monospace small">{user.username}</td>
                      <td>
                        <span className="badge bg-secondary-transparent text-secondary">
                          {POSITION_LABEL[user.employee.position] ?? user.employee.position}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {user.userRoles.map((ur) => (
                            <span
                              key={ur.role.id}
                              className="badge bg-primary-transparent text-primary"
                            >
                              {ur.role.name}
                            </span>
                          ))}
                          {user.userRoles.length === 0 && (
                            <span className="text-muted small">Chưa có vai trò</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.isActive ? 'bg-success-transparent text-success' : 'bg-danger-transparent text-danger'}`}>
                          {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            onClick={() => setEditRolesUser(user)}
                            title="Phân quyền"
                            className="btn btn-sm btn-outline-secondary"
                          >
                            <i className="fe fe-shield"></i>
                          </button>
                          <button
                            onClick={() => { setResetUser(user); setNewPw('') }}
                            title="Đặt lại mật khẩu"
                            className="btn btn-sm btn-outline-secondary"
                          >
                            <i className="fe fe-key"></i>
                          </button>
                          <button
                            onClick={() => toggleActive(user)}
                            title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                            className={`btn btn-sm ${user.isActive ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                          >
                            <i className={`fe ${user.isActive ? 'fe-toggle-right' : 'fe-toggle-left'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-end gap-2 mt-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn btn-sm btn-outline-secondary"
          >
            Trước
          </button>
          <span className="text-muted small">
            Trang {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="btn btn-sm btn-outline-secondary"
          >
            Sau
          </button>
        </div>
      )}

      {/* Dialogs */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {editRolesUser && (
        <EditRolesDialog
          user={editRolesUser}
          onClose={() => setEditRolesUser(null)}
        />
      )}

      {/* Reset password modal */}
      {resetUser && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Đặt lại mật khẩu</h5>
              </div>
              <div className="modal-body">
                <p className="text-muted small">
                  Tài khoản: <strong>{resetUser.username}</strong>
                </p>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                {newPw.length > 0 && newPw.length < 6 && (
                  <div className="text-danger small mt-1">Mật khẩu phải có ít nhất 6 ký tự</div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setResetUser(null)}
                  className="btn btn-outline-secondary"
                >
                  Hủy
                </button>
                <button
                  onClick={handleResetPw}
                  disabled={newPw.length < 6 || resetPw.isPending}
                  className="btn btn-primary text-white"
                >
                  {resetPw.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
