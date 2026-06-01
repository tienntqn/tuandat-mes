import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from './auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { queryClient } from '@/lib/query-client'

export function useLogin() {
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      navigate('/', { replace: true })
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return () => {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}

export function useMe() {
  const { isAuthenticated, setUser } = useAuthStore()

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.getMe()
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
  })
}
