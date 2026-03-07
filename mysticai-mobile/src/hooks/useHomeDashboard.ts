import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { type FetchHomeDashboardParams, fetchHomeDashboard } from '../services/home-dashboard.service';

const ONE_MINUTE = 60 * 1000;

export function useHomeDashboard(params: FetchHomeDashboardParams) {
  const userId = params.user?.id ?? 'guest';
  const sign = params.user?.zodiacSign ?? '';

  return useQuery({
    queryKey: queryKeys.homeDashboard(userId, sign),
    queryFn: () => fetchHomeDashboard(params),
    staleTime: ONE_MINUTE,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
  });
}
