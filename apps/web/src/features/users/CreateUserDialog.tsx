import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useCreateUser, useRoles } from './users.hooks'

const schema = z.object({
  employeeId: z.coerce.number().int().positive('Chọn nhân viên'),
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50),
  password: z.string().min(6, 'Tối thiểu 6 ký tự').max(100),
  roleIds: z.array(z.number()).optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateUserDialog({ open, onClose }: Props) {
  const createUser = useCreateUser()
  const { data: roles } = useRoles()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormValues) => {
    createUser.mutate(data, {
      onSuccess: () => { reset(); onClose() },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Tạo tài khoản mới</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID Nhân viên</label>
            <input
              {...register('employeeId')}
              type="number"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Nhập ID nhân viên"
            />
            {errors.employeeId && <p className="text-xs text-destructive mt-1">{errors.employeeId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
            <input
              {...register('username')}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="vd: nguyen_van_a"
            />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <input
              {...register('password')}
              type="password"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Tối thiểu 6 ký tự"
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vai trò</label>
            <div className="flex flex-wrap gap-2">
              {roles?.map((role) => (
                <label key={role.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={role.id}
                    {...register('roleIds')}
                    className=""
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          {createUser.isError && (
            <p className="text-sm text-destructive">
              {(createUser.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Có lỗi xảy ra'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createUser.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
