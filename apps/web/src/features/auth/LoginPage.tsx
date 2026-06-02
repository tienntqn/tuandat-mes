import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormValues) => login.mutate(data)

  const apiError = login.isError
    ? ((login.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Tên đăng nhập hoặc mật khẩu không đúng')
    : null

  return (
    <div className="login-img">
      {/* GLOBAL LOADER */}
      <div id="global-loader" style={{ display: 'none' }}>
        <img src="/assets/images/loader.svg" className="loader-img" alt="Loader" />
      </div>

      <div className="page">
        <div>
          {/* Logo */}
          <div className="col col-login mx-auto">
            <div className="text-center">
              <div style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(92,103,242,0.15)', borderRadius: '12px', marginTop: '32px' }}>
                <i className="fe fe-settings" style={{ fontSize: '2rem', color: '#5c67f2' }}></i>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#5c67f2', marginTop: '4px' }}>Tuấn Đạt MES</div>
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="container-login100">
            <div className="wrap-login100 p-0">
              <div className="card-body">
                <form className="login100-form validate-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <span className="login100-form-title">Đăng nhập</span>

                  {/* Username */}
                  <div className={`wrap-input100 validate-input ${errors.username ? 'has-error' : ''}`}>
                    <input
                      className="input100"
                      type="text"
                      placeholder="Tên đăng nhập"
                      autoComplete="username"
                      {...register('username')}
                    />
                    <span className="focus-input100"></span>
                    <span className="symbol-input100">
                      <i className="zmdi zmdi-account" aria-hidden="true"></i>
                    </span>
                    {errors.username && (
                      <small className="text-danger d-block mt-1 ms-1">{errors.username.message}</small>
                    )}
                  </div>

                  {/* Password */}
                  <div className={`wrap-input100 validate-input ${errors.password ? 'has-error' : ''}`}>
                    <input
                      className="input100"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Mật khẩu"
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    <span className="focus-input100"></span>
                    <span
                      className="symbol-input100"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPw(!showPw)}
                    >
                      <i className={`zmdi ${showPw ? 'zmdi-eye' : 'zmdi-eye-off'}`} aria-hidden="true"></i>
                    </span>
                    {errors.password && (
                      <small className="text-danger d-block mt-1 ms-1">{errors.password.message}</small>
                    )}
                  </div>

                  {/* API Error */}
                  {apiError && (
                    <div className="alert alert-danger py-2 px-3 mb-2" role="alert">
                      <i className="fe fe-alert-circle me-1"></i> {apiError}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="container-login100-form-btn">
                    <button
                      type="submit"
                      className="login100-form-btn btn-primary"
                      disabled={login.isPending}
                    >
                      {login.isPending ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Đang đăng nhập...
                        </>
                      ) : (
                        'Đăng nhập'
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-3">
                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                      © 2026 Công ty CP Tuấn Đạt
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
