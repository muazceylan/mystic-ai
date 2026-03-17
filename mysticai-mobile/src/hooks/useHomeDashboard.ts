import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { type FetchHomeDashboardParams, fetchHomeDashboard } from '../services/home-dashboard.service';

const ONE_MINUTE = 60 * 1000;
// Dashboard verisi 3 dakika boyunca geçerli kabul edilir.
// Kullanıcı tab'lar arasında gezip döndüğünde cache süresi dolmadıkça
// gereksiz network çağrısı yapılmaz.
const STALE_TIME = 3 * ONE_MINUTE;

export function useHomeDashboard(params: FetchHomeDashboardParams) {
  const userId = params.user?.id ?? 'guest';
  const sign = params.user?.zodiacSign ?? '';
  const locale = params.locale ?? 'tr';

  return useQuery({
    queryKey: queryKeys.homeDashboard(userId, sign, locale),
    queryFn: () => fetchHomeDashboard(params),
    staleTime: STALE_TIME,
    // Cache süresi dolmamışsa mount'ta yeniden fetch yapma.
    // Arka plandan öne geçişte stale olan veri zaten refetchOnReconnect ile güncellenir.
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8_000),
  });
}
