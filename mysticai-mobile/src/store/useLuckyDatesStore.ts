import { create } from 'zustand';
import {
  GoalCategory,
  LuckyDatesResponse,
} from '../services/lucky-dates.service';

interface LuckyDatesState {
  results: Partial<Record<GoalCategory, LuckyDatesResponse>>;
  activeCategory: GoalCategory;
  isLoading: boolean;
  error: string | null;
  pollingCorrelationId: string | null;

  setResult: (category: GoalCategory, response: LuckyDatesResponse) => void;
  setActiveCategory: (category: GoalCategory) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPollingCorrelationId: (id: string | null) => void;
  clear: () => void;
}

export const useLuckyDatesStore = create<LuckyDatesState>()((set) => ({
  results: {},
  activeCategory: 'MARRIAGE',
  isLoading: false,
  error: null,
  pollingCorrelationId: null,

  setResult: (category, response) =>
    set((state) => ({
      results: { ...state.results, [category]: response },
      error: null,
    })),

  setActiveCategory: (activeCategory) => set({ activeCategory }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setPollingCorrelationId: (pollingCorrelationId) => set({ pollingCorrelationId }),

  clear: () =>
    set({ results: {}, error: null, isLoading: false, pollingCorrelationId: null }),
}));
