import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../utils/storage';
import { buildRecommendation } from '../engine/recommendationEngine';
import type { ContentRecommendation } from '../engine/recommendationEngine';
import type { EsmaItem, DuaItem } from '../types';
import type { NatalChartResponse } from '../../services/astrology.service';

interface RecommendationState {
  today: ContentRecommendation | null;
  lastGeneratedDate: string | null; // YYYY-MM-DD
  recentEsmaIds: number[];
  recentDuaIds: number[];
  recentSureIds: number[];

  generate: (
    chart: NatalChartResponse | null,
    esmaList: EsmaItem[],
    duaList: DuaItem[],
  ) => ContentRecommendation;

  markShown: (esmaId: number, duaId: number, sureId?: number) => void;
}

export const useRecommendationStore = create<RecommendationState>()(
  persist(
    (set, get) => ({
      today: null,
      lastGeneratedDate: null,
      recentEsmaIds: [],
      recentDuaIds: [],
      recentSureIds: [],

      generate: (chart, esmaList, duaList) => {
        const dateISO = new Date().toISOString().slice(0, 10);
        const { lastGeneratedDate, today } = get();

        if (lastGeneratedDate === dateISO && today) return today;

        const { recentEsmaIds, recentDuaIds, recentSureIds } = get();
        const rec = buildRecommendation(
          chart,
          esmaList,
          duaList,
          recentEsmaIds,
          recentDuaIds,
          dateISO,
          recentSureIds,
        );

        set({ today: rec, lastGeneratedDate: dateISO });
        return rec;
      },

      markShown: (esmaId, duaId, sureId) => {
        set((s) => ({
          recentEsmaIds: [...s.recentEsmaIds.slice(-3), esmaId],
          recentDuaIds: [...s.recentDuaIds.slice(-3), duaId],
          recentSureIds: sureId ? [...s.recentSureIds.slice(-3), sureId] : s.recentSureIds,
        }));
      },
    }),
    {
      name: 'spiritual-recommendation-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        today: s.today,
        lastGeneratedDate: s.lastGeneratedDate,
        recentEsmaIds: s.recentEsmaIds,
        recentDuaIds: s.recentDuaIds,
        recentSureIds: s.recentSureIds,
      }),
    },
  ),
);
