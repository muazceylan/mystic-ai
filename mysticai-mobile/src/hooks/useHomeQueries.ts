import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSkyPulse,
  fetchWeeklySwot,
  fetchLatestNatalChart,
  SkyPulseResponse,
  WeeklySwotResponse,
  NatalChartResponse,
} from '../services/astrology.service';
import { fetchDailySecret, fetchHomeBrief, DailySecret, HomeBrief } from '../services/oracle.service';
import { queryKeys } from '../lib/queryKeys';

/** ms until midnight local time (min 5 min) */
function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(midnight.getTime() - now.getTime(), 5 * 60 * 1000);
}

/** ms until end of Sunday 23:59:59 local time (min 1h) */
function msUntilEndOfWeek(): number {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const endOfSunday = new Date(now);
  endOfSunday.setDate(now.getDate() + daysUntilSunday);
  endOfSunday.setHours(23, 59, 59, 999);
  return Math.max(endOfSunday.getTime() - now.getTime(), 60 * 60 * 1000);
}

export type { DailySecret, HomeBrief, SkyPulseResponse, WeeklySwotResponse, NatalChartResponse };

interface DailySecretParams {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
  focusPoint?: string;
}

export function useDailySecret(params: DailySecretParams | null) {
  return useQuery({
    queryKey: queryKeys.dailySecret({
      name: params?.name,
      birthDate: params?.birthDate,
      maritalStatus: params?.maritalStatus,
      focusPoint: params?.focusPoint,
    }),
    queryFn: async () => {
      const res = await fetchDailySecret(params ?? undefined);
      return res.data;
    },
    enabled: !!params,
    staleTime: msUntilMidnight(), // gece yarısına kadar geçerli
  });
}

export function useHomeBrief(params: DailySecretParams | null) {
  return useQuery({
    queryKey: queryKeys.homeBrief({
      name: params?.name,
      birthDate: params?.birthDate,
      maritalStatus: params?.maritalStatus,
      focusPoint: params?.focusPoint,
    }),
    queryFn: async () => {
      const res = await fetchHomeBrief(params ?? undefined);
      return res.data;
    },
    enabled: !!params,
    staleTime: msUntilMidnight(),
  });
}

export function useSkyPulse() {
  return useQuery({
    queryKey: queryKeys.skyPulse(),
    queryFn: async () => {
      const res = await fetchSkyPulse();
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // 1 saat - gökyüzü verisi
  });
}

export function useWeeklySwot(userId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.weeklySwot(userId ?? 0),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      const res = await fetchWeeklySwot(userId);
      return res.data;
    },
    enabled: !!userId,
    staleTime: msUntilEndOfWeek(), // pazar sonu 23:59'a kadar geçerli
  });
}

export function useNatalChart(userId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.natalChart(userId ?? 0),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      const res = await fetchLatestNatalChart(userId);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 dakika - doğum haritası nadiren değişir
  });
}

/** Ana ekran refresh için tüm home query'lerini invalidate eder */
export function useInvalidateHomeQueries() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['oracle'] });
    qc.invalidateQueries({ queryKey: ['astrology'] });
  };
}
