import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { NatalChartResponse } from '../services/astrology.service';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface NatalChartState {
  chart: NatalChartResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  setChart: (chart: NatalChartResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
  isStale: () => boolean;
}

export const useNatalChartStore = create<NatalChartState>()(
  persist(
    (set, get) => ({
      chart: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,

      setChart: (chart) =>
        set({ chart, lastFetchedAt: Date.now(), error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clear: () =>
        set({ chart: null, lastFetchedAt: null, error: null, isLoading: false }),

      isStale: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - lastFetchedAt > STALE_THRESHOLD_MS;
      },
    }),
    {
      name: 'natal-chart-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chart: state.chart,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
