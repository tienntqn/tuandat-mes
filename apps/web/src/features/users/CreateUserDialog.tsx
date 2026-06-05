import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useCreateUser, useRoles } from './users.hooks'
import { useEmployees } from '@/features/employee/employee.hooks'
import { POSITION_LABELS } from '@/features/employee/employee.api'
import { suggestUsername } from './username'
import { toast } from '@/lib/toast'

interface Props {
  open: boolean
  onClose: () => void
}

const DEFAULT_PASSWORD = '123456@'

export function CreateUserDialog({ open, onClose }: Props) {
  const createUser = useCreateUser()
  const { data: roles } = useRoles()
  // Lấy nhiều nhân viên để chọn (lọc người CHƯA có tài khoản)
  const { data: empData } = useEmployees({ pageSize: 500 })
  const employees = useMemo(
    () => (empData?.data ?? []).filter((e) => !e.user && !e.deletedAt),
    [empData],
  )

  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setEmployeeId('')
      setUsername('')
      setPassword(DEFAULT_PASSWORD)
      setRoleIds([])
      setError('')
    }
  }, [open])

  // Khi chọn nhân viên: gợi ý username theo mã NV + tự chọn vai trò trùng chức danh
  const onSelectEmployee = (idStr: string) => {
    const id = idStr ? Number(idStr) : ''
    setEmployeeId(id)
    if (!id) return
    const emp = employees.find((e) => e.id === id)
    if (!emp) return
    setUsername(suggestUsername(emp))
    const matchRole = roles?.find((r) => r.name === emp.position)
    setRoleIds(matchRole ? [matchRole.id] : [])
  }

  const toggleRole = (id: number) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!employeeId) { setError('Vui lòng chọn nhân viên'); return }
    if (username.trim().length < 3) { setError('Tên đăng nhập tối thiểu 3 ký tự'); return }
    if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return }
    createUser.mutate(
      { employeeId: Number(employeeId), username: username.trim(), password, roleIds },
      {
        onSuccess: () => { toast.success('Đã tạo tài khoản'); onClose() },
        onError: (e: any) => setError(e?.response?.data?.message || 'Không thể tạo tài khoản'),
      },
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Tạo tài khoản mới</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nhân viên</label>
            <select
              value={employeeId}
              onChange={(e) => onSelectEmployee(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
            >
              <option value="">— Chọn nhân viên —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.fullName} ({POSITION_LABELS[e.position] ?? e.position})
                </option>
              ))}
            </select>
            {employees.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Tất cả nhân viên đã có tài khoản.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="vd: nguyen_van_a"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Tối thiểu 6 ký tự"
            />
            <p className="text-xs text-muted-foreground mt-1">Mặc định: {DEFAULT_PASSWORD}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vai trò</label>
            <div className="flex flex-wrap gap-2">
              {roles?.map((role) => (
                <label key={role.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={createUser.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createUser.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
