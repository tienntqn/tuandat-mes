import { useState } from 'react'
import { Plus, RefreshCw, KeyRound, ToggleLeft, ToggleRight, Shield } from 'lucide-react'
import { useUsers, useRoles, useUpdateUser, useResetPassword } from './users.hooks'
import { CreateUserDialog } from './CreateUserDialog'
import { EditRolesDialog } from './EditRolesDialog'
import type { UserListItem } from './users.api'
import { cn } from '@/lib/utils'

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
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} tài khoản
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nhân viên</th>
              <th className="px-4 py-3 text-left font-medium">Tài khoản</th>
              <th className="px-4 py-3 text-left font-medium">Chức danh</th>
              <th className="px-4 py-3 text-left font-medium">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Đang tải...
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Chưa có tài khoản nào
                </td>
              </tr>
            ) : (
              data?.data.map((user) => (
                <tr key={user.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.employee.code}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {POSITION_LABEL[user.employee.position] ?? user.employee.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {ur.role.name}
                        </span>
                      ))}
                      {user.userRoles.length === 0 && (
                        <span className="text-xs text-muted-foreground">Chưa có vai trò</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700',
                      )}
                    >
                      {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditRolesUser(user)}
                        title="Phân quyền"
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setResetUser(user); setNewPw('') }}
                        title="Đặt lại mật khẩu"
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        className={cn(
                          'p-1.5 rounded hover:bg-accent',
                          user.isActive ? 'text-green-600' : 'text-muted-foreground',
                        )}
                      >
                        {user.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent"
          >
            Trước
          </button>
          <span className="text-muted-foreground">
            Trang {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-card border p-6 shadow-xl">
            <h2 className="font-bold text-lg">Đặt lại mật khẩu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tài khoản: <strong>{resetUser.username}</strong>
            </p>
            <input
              className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
              type="password"
              placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            {newPw.length > 0 && newPw.length < 6 && (
              <p className="text-xs text-destructive mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setResetUser(null)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPw}
                disabled={newPw.length < 6 || resetPw.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resetPw.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
