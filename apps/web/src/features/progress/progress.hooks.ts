import { useQuery } from '@tanstack/react-query'
import { progressApi } from './progress.api'

export function useProgress(stage: string) {
  return useQuery({ queryKey: ['progress', stage], queryFn: () => progressApi.byStage(stage) })
}
