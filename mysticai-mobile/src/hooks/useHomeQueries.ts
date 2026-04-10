import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSkyPulse,
  fetchWeeklySwot,
  fetchLatestNatalChart,
  fetchDailyLifeGuide,
  SkyPulseResponse,
  WeeklySwotResponse,
  NatalChartResponse,
  DailyLifeGuideResponse,
} from '../services/astrology.service';
import { fetchDailySecret, fetchHomeBrief, DailySecret, HomeBrief } from '../services/oracle.service';
import { fetchCosmicSummary, CosmicSummaryResponse } from '../services/cosmic.service';
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

export type {
  DailySecret,
  HomeBrief,
} from '../services/oracle.service';
export type {
  SkyPulseResponse,
  WeeklySwotResponse,
  NatalChartResponse,
  DailyLifeGuideResponse,
} from '../services/astrology.service';
export type { CosmicSummaryResponse } from '../services/cosmic.service';

interface DailySecretParams {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
}

interface DailyLifeGuideParams {
  userId?: number;
  locale?: string;
  userGender?: string;
  maritalStatus?: string;
  date?: string;
}

export function useDailySecret(params: DailySecretParams | null) {
  return useQuery({
    queryKey: queryKeys.dailySecret({
      name: params?.name,
      birthDate: params?.birthDate,
      maritalStatus: params?.maritalStatus,
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

export function useWeeklySwot(userId: number | undefined, locale?: string) {
  return useQuery({
    queryKey: queryKeys.weeklySwot(userId ?? 0, locale),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      const res = await fetchWeeklySwot(userId, locale);
      return res.data;
    },
    enabled: !!userId,
    staleTime: msUntilEndOfWeek(), // pazar sonu 23:59'a kadar geçerli
  });
}

export function useDailyLifeGuide(params: DailyLifeGuideParams | null) {
  return useQuery({
    queryKey: queryKeys.dailyLifeGuide(params?.userId ?? 0, params?.locale, params?.date),
    queryFn: async () => {
      if (!params?.userId) throw new Error('userId required');
      const res = await fetchDailyLifeGuide({
        userId: params.userId,
        locale: params.locale,
        userGender: params.userGender,
        maritalStatus: params.maritalStatus,
        date: params.date,
      });
      return res.data;
    },
    enabled: !!params?.userId,
    staleTime: msUntilMidnight(),
  });
}

export function useCosmicSummary(params: DailyLifeGuideParams | null) {
  return useQuery({
    queryKey: queryKeys.cosmicSummary(
      params?.userId ?? 0,
      params?.locale,
      params?.date,
      params?.userGender,
      params?.maritalStatus,
    ),
    queryFn: async () => {
      if (!params?.userId) throw new Error('userId required');
      const res = await fetchCosmicSummary({
        userId: params.userId,
        locale: params.locale,
        date: params.date,
        gender: params.userGender,
        maritalStatus: params.maritalStatus,
      });
      return res.data as CosmicSummaryResponse;
    },
    enabled: !!params?.userId,
    staleTime: msUntilMidnight(),
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
