import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 phút
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status: number } })?.response?.status
        // Không retry với lỗi auth
        if (status === 401 || status === 403) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
