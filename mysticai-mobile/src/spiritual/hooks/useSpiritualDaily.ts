import { useQuery } from '@tanstack/react-query';
import { spiritualApi } from '../api/spiritual.api';

const spiritualKeys = {
  dailyPrayers: (date?: string) => ['spiritual', 'daily-prayers', date ?? 'today'] as const,
  dailyAsma: (date?: string) => ['spiritual', 'daily-asma', date ?? 'today'] as const,
  dailyMeditation: (date?: string) => ['spiritual', 'daily-meditation', date ?? 'today'] as const,
  weeklyStats: (week?: string) => ['spiritual', 'weekly-stats', week ?? 'current'] as const,
  prayerDetail: (id: number) => ['spiritual', 'prayer-detail', id] as const,
  asmaList: (search?: string, theme?: string, sort?: string, page?: number, pageSize?: number) =>
    ['spiritual', 'asma-list', search ?? '', theme ?? '', sort ?? 'order', page ?? 1, pageSize ?? 20] as const,
  asmaDetail: (id: number) => ['spiritual', 'asma-detail', id] as const,
  preferences: () => ['spiritual', 'preferences'] as const,
};

export function useSpiritualDaily(date?: string) {
  const prayers = useQuery({
    queryKey: spiritualKeys.dailyPrayers(date),
    queryFn: () => spiritualApi.getDailyPrayers(date),
    staleTime: 1000 * 60 * 30,
  });

  const asma = useQuery({
    queryKey: spiritualKeys.dailyAsma(date),
    queryFn: () => spiritualApi.getDailyAsma(date),
    staleTime: 1000 * 60 * 60,
  });

  const meditation = useQuery({
    queryKey: spiritualKeys.dailyMeditation(date),
    queryFn: () => spiritualApi.getDailyMeditation(date),
    staleTime: 1000 * 60 * 60,
  });

  return { prayers, asma, meditation };
}

export function useSpiritualWeeklyStats(week: string) {
  return useQuery({
    queryKey: spiritualKeys.weeklyStats(week),
    queryFn: () => spiritualApi.getWeeklyStats(week),
    staleTime: 1000 * 60 * 15,
  });
}

export function useSpiritualPrayerDetail(id?: number) {
  return useQuery({
    queryKey: spiritualKeys.prayerDetail(id ?? -1),
    queryFn: () => spiritualApi.getPrayerDetail(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
    staleTime: 1000 * 60 * 30,
  });
}

export function useAsmaList(params: {
  search?: string;
  theme?: string;
  sort?: 'order' | 'alpha';
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: spiritualKeys.asmaList(params.search, params.theme, params.sort, params.page, params.pageSize),
    queryFn: () => spiritualApi.getAsmaList(params),
    staleTime: 1000 * 60 * 30,
  });
}

export function useAsmaDetail(id?: number) {
  return useQuery({
    queryKey: spiritualKeys.asmaDetail(id ?? -1),
    queryFn: () => spiritualApi.getAsmaDetail(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
    staleTime: 1000 * 60 * 30,
  });
}

export function useSpiritualPreferences() {
  return useQuery({
    queryKey: spiritualKeys.preferences(),
    queryFn: () => spiritualApi.getPreferences(),
    staleTime: 1000 * 60 * 10,
  });
}
