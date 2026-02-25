import { create } from 'zustand';
import type { HousePlacement, PlanetPosition } from '../services/astrology.service';

export interface NightSkyPosterDraft {
  userId?: number;
  chartId?: number;
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  shareUrl: string;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  createdAt: number;
}

interface NightSkyPosterState {
  draft: NightSkyPosterDraft | null;
  setDraft: (draft: NightSkyPosterDraft) => void;
  clearDraft: () => void;
}

export const useNightSkyPosterStore = create<NightSkyPosterState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
