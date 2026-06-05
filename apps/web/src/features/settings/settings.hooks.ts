import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type UpdateAppSettings } from './settings.api'
import { useToast } from '@/components/ui/use-toast'

export const settingsKeys = {
  all: ['app-settings'] as const,
}

export function useAppSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (dto: UpdateAppSettings) => settingsApi.update(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      toast({ title: 'Đã lưu cấu hình' })
    },
    onError: (err: any) => {
      toast({
        title: 'Lỗi',
        description: err?.response?.data?.message || 'Không thể lưu cấu hình',
        variant: 'destructive',
      })
    },
  })
}
