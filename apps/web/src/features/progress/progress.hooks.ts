import { useQuery } from '@tanstack/react-query'
import { progressApi } from './progress.api'

export function useProgress(stage: string, factoryId?: number, styleId?: number) {
  return useQuery({
    queryKey: ['progress', stage, factoryId, styleId],
    queryFn: () => progressApi.byStage({ stage, factoryId, styleId }),
  })
}
