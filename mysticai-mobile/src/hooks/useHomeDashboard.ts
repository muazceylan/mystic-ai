import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { type FetchHomeDashboardParams, fetchHomeDashboard } from '../services/home-dashboard.service';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useHomeDashboard(params: FetchHomeDashboardParams) {
  const userId = params.user?.id ?? 'guest';
  const sign = params.user?.zodiacSign ?? '';

  return useQuery({
    queryKey: queryKeys.homeDashboard(userId, sign),
    queryFn: () => fetchHomeDashboard(params),
    staleTime: FIVE_MINUTES,
    retry: 1,
  });
}
