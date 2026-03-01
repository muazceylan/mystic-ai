import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../../utils/storage';
import { HoroscopeResponse, HoroscopePeriod, ZodiacSign } from '../types/horoscope.types';
import { fetchHoroscope, clearHoroscopeCache } from '../services/horoscope.service';
import i18n from '../../../i18n';

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface HoroscopeState {
  current: HoroscopeResponse | null;
  period: HoroscopePeriod;
  selectedSign: ZodiacSign | null;
  loading: boolean;
  error: string | null;
  favorites: string[];

  setPeriod: (p: HoroscopePeriod) => void;
  setSelectedSign: (s: ZodiacSign) => void;
  fetch: (sign: ZodiacSign, period: HoroscopePeriod) => Promise<void>;
  toggleFavorite: (key: string) => void;
  clear: () => void;
}

export const useHoroscopeStore = create<HoroscopeState>()(
  persist(
    (set, get) => ({
      current: null,
      period: 'daily',
      selectedSign: null,
      loading: false,
      error: null,
      favorites: [],

      setPeriod: (period) => set({ period }),

      setSelectedSign: (sign) => set({ selectedSign: sign }),

      fetch: async (sign, period) => {
        // Clear stale data if day has changed
        const { current } = get();
        if (current?.date && current.date !== todayStr()) {
          clearHoroscopeCache();
          set({ current: null });
        }

        set({ loading: true, error: null });
        try {
          const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';
          const data = await fetchHoroscope(sign, period, lang);
          set({ current: data, loading: false, selectedSign: sign });
        } catch (e: any) {
          set({ loading: false, error: e?.message ?? 'Error' });
        }
      },

      toggleFavorite: (key) => {
        const { favorites } = get();
        if (favorites.includes(key)) {
          set({ favorites: favorites.filter((f) => f !== key) });
        } else {
          set({ favorites: [...favorites, key] });
        }
      },

      clear: () => set({ current: null, error: null, loading: false }),
    }),
    {
      name: 'horoscope-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        period: state.period,
      }),
    },
  ),
);
