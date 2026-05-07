import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { bindUserScopedPersist, getInitialUserScopedStoreName } from './userScopedPersist';
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

const NATAL_CHART_STORE_NAME = 'natal-chart-store';
const EMPTY_NATAL_CHART_STATE: Pick<
  NatalChartState,
  'chart' | 'isLoading' | 'error' | 'lastFetchedAt'
> = {
  chart: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const useNatalChartStore = create<NatalChartState>()(
  persist(
    (set, get) => ({
      ...EMPTY_NATAL_CHART_STATE,

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
      name: getInitialUserScopedStoreName(NATAL_CHART_STORE_NAME),
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chart: state.chart,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

bindUserScopedPersist({
  store: useNatalChartStore,
  baseName: NATAL_CHART_STORE_NAME,
  emptyState: EMPTY_NATAL_CHART_STATE,
});
