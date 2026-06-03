import { create } from 'zustand';
import type { HousePlacement, NatalPlanetComboInsight, PlanetPosition, PlanetaryAspect } from '../services/astrology.service';

export type NatalVisualPresetKey = 'wheel' | 'matrix' | 'balance';

export type NatalVisualsDraft = {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string | null;
  risingSign?: string | null;
  presetKey?: NatalVisualPresetKey;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetComboInsights?: NatalPlanetComboInsight[];
  createdAt: number;
};

type NatalVisualsStore = {
  draft: NatalVisualsDraft | null;
  setDraft: (draft: NatalVisualsDraft) => void;
  clearDraft: () => void;
};

export const useNatalVisualsStore = create<NatalVisualsStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));

export default useNatalVisualsStore;
