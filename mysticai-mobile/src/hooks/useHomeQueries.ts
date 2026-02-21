import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSkyPulse,
  fetchWeeklySwot,
  fetchLatestNatalChart,
  SkyPulseResponse,
  WeeklySwotResponse,
  NatalChartResponse,
} from '../services/astrology.service';
import { fetchDailySecret, DailySecret } from '../services/oracle.service';
import { queryKeys } from '../lib/queryKeys';

export type { DailySecret, SkyPulseResponse, WeeklySwotResponse, NatalChartResponse };

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
    staleTime: 1000 * 60 * 15, // 15 dakika - günlük sır günde bir kez değişir
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
    staleTime: 1000 * 60 * 60 * 6, // 6 saat - haftalık swot
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
