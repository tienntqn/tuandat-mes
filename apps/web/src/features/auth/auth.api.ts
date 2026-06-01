import { apiClient } from '@/lib/axios'
import type { AuthUser } from '@/stores/auth.store'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  getMe: () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient
      .post<{ message: string }>('/auth/change-password', { oldPassword, newPassword })
      .then((r) => r.data),
}
