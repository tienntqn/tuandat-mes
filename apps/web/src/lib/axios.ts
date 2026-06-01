import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Gắn access token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Xử lý refresh token tự động khi 401
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    // Không retry nếu đã retry hoặc không phải 401 hoặc là chính request refresh
    if (
      error.response?.status !== 401 ||
      original?._retry ||
      original?.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        refreshQueue.push(resolve)
      }).then((token) => {
        original!.headers!.Authorization = `Bearer ${token}`
        return apiClient(original!)
      })
    }

    original!._retry = true
    isRefreshing = true

    try {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)

      refreshQueue.forEach((cb) => cb(data.accessToken))
      refreshQueue = []

      original!.headers!.Authorization = `Bearer ${data.accessToken}`
      return apiClient(original!)
    } catch {
      useAuthStore.getState().logout()
      window.location.replace('/login')
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export const api = apiClient
export default apiClient
