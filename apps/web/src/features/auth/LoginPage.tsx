import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Factory } from 'lucide-react'
import { useLogin } from './auth.hooks'

const schema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormValues) => login.mutate(data)

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (ẩn trên mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 to-blue-900 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8" />
          <span className="text-xl font-bold">Tuấn Đạt MES</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Hệ thống Quản lý
            <br />
            Sản xuất May mặc
          </h1>
          <p className="mt-4 text-blue-200 text-lg">
            Theo dõi sản lượng, kế hoạch và máy móc theo thời gian thực.
          </p>
        </div>
        <p className="text-blue-300 text-sm">© 2026 Công ty CP Tuấn Đạt</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Factory className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-primary">Tuấn Đạt MES</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Đăng nhập</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập thông tin tài khoản để tiếp tục
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium">
                Tên đăng nhập
              </label>
              <input
                id="username"
                {...register('username')}
                autoComplete="username"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập tên đăng nhập"
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* API error */}
            {login.isError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {(login.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  'Tên đăng nhập hoặc mật khẩu không đúng'}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || login.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
