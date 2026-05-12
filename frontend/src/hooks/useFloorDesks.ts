import { useQuery } from '@tanstack/react-query'

import { getFloorDesks } from '../api/client'

export function useFloorDesks(floorId: number) {
  return useQuery({
    queryKey: ['floor-desks', floorId],
    queryFn: () => getFloorDesks(floorId),
    enabled: Number.isFinite(floorId) && floorId > 0,
    retry: 1,
    staleTime: 30_000,
  })
}