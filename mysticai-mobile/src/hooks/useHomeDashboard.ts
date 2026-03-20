import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  type FetchHomeDashboardParams,
  fetchHomeDashboard,
  fetchHomeDashboardFast,
} from '../services/home-dashboard.service';

const ONE_MINUTE = 60 * 1000;
const STALE_TIME = 3 * ONE_MINUTE;

/**
 * İki aşamalı home dashboard hook:
 *
 * Faz 1 — Hızlı (fast): skyPulse + weeklySwot (~1-2sn)
 *   Dashboard fallback içerikle anında render edilir.
 *   Yeni kullanıcılar dahil tüm açılışlarda iskelet süresi ~1-2sn'ye iner.
 *
 * Faz 2 — Oracle: AI synthesis içeren tam dashboard (~3-10sn)
 *   Hero insight + horoscope theme/advice oracle verisiyle güncellenir.
 *   Oracle hazır olduğunda sayfa yeniden render tetiklenmez; veri sessizce yerleşir.
 *
 * Tüketici (HomeScreen) `data` ile çalışır:
 *   - Fast data gelince → sayfa açılır (isLoading: false)
 *   - Oracle gelince → hero/horoscope alanları güncellenir (isOracleLoading: false)
 */
export function useHomeDashboard(params: FetchHomeDashboardParams) {
  const userId = params.user?.id ?? 'guest';
  const sign = params.user?.zodiacSign ?? '';
  const locale = params.locale ?? 'tr';

  // Faz 1: skyPulse + weeklySwot — oracle beklenmez, ~1-2sn
  const fastQuery = useQuery({
    queryKey: queryKeys.homeDashboardFast(userId, locale),
    queryFn: () => fetchHomeDashboardFast(params),
    staleTime: STALE_TIME,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8_000),
  });

  // Faz 2: Oracle AI synthesis — ~3-10sn, hata durumunda fast data kalır
  const oracleQuery = useQuery({
    queryKey: queryKeys.homeDashboard(userId, sign, locale),
    queryFn: () => fetchHomeDashboard(params),
    staleTime: STALE_TIME,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    // Oracle başarısız olursa fast data zaten görüntüleniyor; agresif retry yapma.
    retry: 1,
    retryDelay: 5_000,
  });

  // Oracle verisi hazırsa onu kullan; yoksa fast data göster.
  const data = oracleQuery.data ?? fastQuery.data;

  return {
    data,
    // isLoading: sadece fast faz bekleniyor (~1-2sn); oracle gecikse dahi false olur.
    isLoading: fastQuery.isLoading,
    isFetching: fastQuery.isFetching,
    isError: fastQuery.isError && !fastQuery.data,
    // Oracle hâlâ yükleniyorsa hero/horoscope alanları güncellenmek üzere.
    isOracleLoading: oracleQuery.isLoading || oracleQuery.isFetching,
    refetch: () => {
      void fastQuery.refetch();
      void oracleQuery.refetch();
    },
  };
}
