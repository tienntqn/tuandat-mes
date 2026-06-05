import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useUpdateUser, useRoles } from './users.hooks'
import type { UserListItem } from './users.api'

interface Props {
  user: UserListItem
  onClose: () => void
}

export function EditRolesDialog({ user, onClose }: Props) {
  const { data: roles } = useRoles()
  const updateUser = useUpdateUser()

  const [selected, setSelected] = useState<number[]>(
    user.userRoles.map((ur) => ur.role.id),
  )

  useEffect(() => {
    setSelected(user.userRoles.map((ur) => ur.role.id))
  }, [user])

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const handleSave = () => {
    updateUser.mutate(
      { id: user.id, data: { roleIds: selected } },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header cố định */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-bold text-lg">Phân quyền</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vùng danh sách vai trò có thể cuộn */}
        <div className="px-5 py-4 overflow-y-auto" style={{ flex: '1 1 auto' }}>
          <p className="text-sm text-muted-foreground mb-3">
            Tài khoản: <strong>{user.username}</strong> — {user.employee.fullName}
          </p>
          <div className="space-y-2">
            {roles?.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(role.id)}
                  onChange={() => toggle(role.id)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer cố định */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={updateUser.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {updateUser.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
