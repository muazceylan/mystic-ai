import { create } from 'zustand';
import type { Mood } from '../types';

interface PrayerFlowState {
  setId: number | null;
  date: string | null;
  currentIndex: number;
  countsByPrayerId: Record<number, number>;
  mood?: Mood;
  note?: string;
  isSaving: boolean;
  saveError: string | null;
  startSet: (payload: { setId: number | null; date: string }) => void;
  increment: (prayerId: number, by?: number) => void;
  setMood: (mood?: Mood) => void;
  setNote: (note?: string) => void;
  next: (maxItems: number) => void;
  reset: () => void;
}

export const usePrayerFlowStore = create<PrayerFlowState>((set) => ({
  setId: null,
  date: null,
  currentIndex: 0,
  countsByPrayerId: {},
  mood: undefined,
  note: undefined,
  isSaving: false,
  saveError: null,

  startSet: ({ setId, date }) =>
    set({
      setId,
      date,
      currentIndex: 0,
      countsByPrayerId: {},
      mood: undefined,
      note: undefined,
      isSaving: false,
      saveError: null,
    }),

  increment: (prayerId, by = 1) =>
    set((state) => ({
      countsByPrayerId: {
        ...state.countsByPrayerId,
        [prayerId]: Math.max(0, (state.countsByPrayerId[prayerId] ?? 0) + by),
      },
    })),

  setMood: (mood) => set({ mood }),
  setNote: (note) => set({ note }),

  next: (maxItems) =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, Math.max(0, maxItems - 1)),
    })),

  reset: () =>
    set({
      setId: null,
      date: null,
      currentIndex: 0,
      countsByPrayerId: {},
      mood: undefined,
      note: undefined,
      isSaving: false,
      saveError: null,
    }),
}));

