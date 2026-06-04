import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { reportApi, type KpiResult } from './report.api'
import { useAuthStore } from '@/stores/auth.store'

export const reportKeys = {
  progress: (params?: object) => ['report', 'progress', params] as const,
  colorSize: (params?: object) => ['report', 'color-size', params] as const,
  kpi: ['report', 'kpi'] as const,
  alerts: ['report', 'alerts'] as const,
  settings: ['report', 'settings'] as const,
}

export function useProgressReport(params?: { factoryId?: number; styleId?: number; stage?: string }) {
  return useQuery({
    queryKey: reportKeys.progress(params),
    queryFn: () => reportApi.getProgress(params),
  })
}

export function useColorSizeReport(params?: { styleId?: number; stage?: string }) {
  return useQuery({
    queryKey: reportKeys.colorSize(params),
    queryFn: () => reportApi.getColorSize(params),
  })
}

export function useKpi() {
  return useQuery({
    queryKey: reportKeys.kpi,
    queryFn: reportApi.getKpi,
    refetchInterval: 60_000, // fallback polling mỗi phút
  })
}

export function useAlerts() {
  return useQuery({
    queryKey: reportKeys.alerts,
    queryFn: reportApi.getAlerts,
    refetchInterval: 2 * 60_000,
  })
}

export function useReportSettings() {
  return useQuery({
    queryKey: reportKeys.settings,
    queryFn: reportApi.getSettings,
    staleTime: 5 * 60_000,
  })
}

// SSE hook: nhận KPI update real-time từ server
export function useKpiStream(onUpdate: (kpi: KpiResult) => void) {
  const token = useAuthStore((s) => s.accessToken)
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!token) return
    // EventSource không gửi được header Authorization → truyền token qua query param
    const url = `${apiBase}/report/stream/kpi?token=${encodeURIComponent(token)}`
    const es = new EventSource(url, { withCredentials: false })
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const kpi: KpiResult = JSON.parse(e.data)
        onUpdate(kpi)
      } catch {
        // ignore parse errors
      }
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [token, apiBase, onUpdate])
}
