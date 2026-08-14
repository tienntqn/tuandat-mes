import { useQuery } from '@tanstack/react-query'
import { machineProfileApi } from './machine-profile.api'

const PROFILE = 'machine-profile'

export function useMachineTimeline(machineId?: number) {
  return useQuery({
    queryKey: [PROFILE, 'timeline', machineId],
    queryFn: () => machineProfileApi.timeline(machineId!),
    enabled: !!machineId,
  })
}

export function useMachineStatistics(params?: { fromDate?: string; toDate?: string; factoryId?: number }) {
  return useQuery({
    queryKey: [PROFILE, 'statistics', params],
    queryFn: () => machineProfileApi.statistics(params),
  })
}

export function useMechanicAlerts() {
  return useQuery({
    queryKey: [PROFILE, 'alerts'],
    queryFn: machineProfileApi.alerts,
    // Cảnh báo cần tương đối tươi vì cơ điện xử lý việc theo thời gian thực
    refetchInterval: 60_000,
  })
}
