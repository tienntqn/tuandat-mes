import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { outputApi, type CreateOutputPayload } from './output.api'
import { useToast } from '@/components/ui/use-toast'
import { syncOfflineQueue } from './lib/offline-store'

export const outputKeys = {
  settings: ['output', 'settings'] as const,
  styles: ['output', 'styles'] as const,
  today: ['output', 'today'] as const,
  history: (days: number) => ['output', 'history', days] as const,
  logs: (id: number) => ['output', 'logs', id] as const,
}

export function useOutputSettings() {
  return useQuery({
    queryKey: outputKeys.settings,
    queryFn: outputApi.getSettings,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyStyles() {
  return useQuery({
    queryKey: outputKeys.styles,
    queryFn: outputApi.getMyStyles,
    staleTime: 2 * 60 * 1000,
  })
}

export function useTodayOutput() {
  return useQuery({
    queryKey: outputKeys.today,
    queryFn: outputApi.getToday,
    refetchInterval: 60 * 1000, // tự refresh mỗi phút
  })
}

export function useOutputHistory(days = 7) {
  return useQuery({
    queryKey: outputKeys.history(days),
    queryFn: () => outputApi.getHistory(days),
  })
}

export function useOutputLogs(outputId: number) {
  return useQuery({
    queryKey: outputKeys.logs(outputId),
    queryFn: () => outputApi.getLogs(outputId),
    enabled: outputId > 0,
  })
}

export function useUpsertOutput() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: CreateOutputPayload) => {
      try {
        const result = await outputApi.upsert(payload)
        return result
      } catch (err: any) {
        // Nếu offline → lưu vào queue
        if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
          const { addToOfflineQueue } = await import('./lib/offline-store')
          await addToOfflineQueue(payload)
          throw new Error('OFFLINE_QUEUED')
        }
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outputKeys.today })
      queryClient.invalidateQueries({ queryKey: outputKeys.history(7) })
      toast({ title: 'Đã lưu sản lượng thành công' })
    },
    onError: (err: Error) => {
      if (err.message === 'OFFLINE_QUEUED') {
        toast({
          title: 'Đã lưu offline',
          description: 'Sẽ tự động đồng bộ khi có mạng',
        })
      } else {
        toast({
          title: 'Lỗi',
          description: err.message || 'Không thể lưu sản lượng',
          variant: 'destructive',
        })
      }
    },
  })
}

// Hook kích hoạt sync khi online lại
export function useOfflineSync() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const sync = async () => {
    try {
      const synced = await syncOfflineQueue()
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['output'] })
        toast({ title: `Đồng bộ thành công ${synced} bản ghi offline` })
      }
    } catch {
      // silent
    }
  }

  return { sync }
}
