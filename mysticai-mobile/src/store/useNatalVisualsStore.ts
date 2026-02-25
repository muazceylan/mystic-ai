import { create } from 'zustand';
import type { HousePlacement, PlanetPosition, PlanetaryAspect } from '../services/astrology.service';

export type NatalVisualsDraft = {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string | null;
  risingSign?: string | null;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
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
