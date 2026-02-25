import { create } from 'zustand';
import {
  SavedPersonResponse,
  SynastryResponse,
  RelationshipType,
  SynastryRequest,
  addSavedPerson,
  getSavedPeople,
  deleteSavedPerson,
  analyzeSynastry,
  getSynastry,
  SavedPersonRequest,
} from '../services/synastry.service';

interface SynastryState {
  savedPeople: SavedPersonResponse[];
  currentSynastry: SynastryResponse | null;
  isLoadingPeople: boolean;
  isAnalyzing: boolean;
  error: string | null;

  loadSavedPeople: (userId: number) => Promise<void>;
  addPerson: (req: SavedPersonRequest) => Promise<SavedPersonResponse>;
  removePerson: (personId: number, userId: number) => Promise<void>;

  analyze: (
    userId: number,
    savedPersonId: number,
    type: RelationshipType,
    locale?: string
  ) => Promise<SynastryResponse>;
  analyzePair: (req: SynastryRequest) => Promise<SynastryResponse>;
  pollSynastry: (synastryId: number) => Promise<SynastryResponse>;
  clearSynastry: () => void;
  clearError: () => void;
}

export const useSynastryStore = create<SynastryState>()((set, get) => ({
  savedPeople: [],
  currentSynastry: null,
  isLoadingPeople: false,
  isAnalyzing: false,
  error: null,

  loadSavedPeople: async (userId) => {
    set({ isLoadingPeople: true, error: null });
    try {
      const res = await getSavedPeople(userId);
      set({ savedPeople: res.data, isLoadingPeople: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Kişiler yüklenemedi', isLoadingPeople: false });
    }
  },

  addPerson: async (req) => {
    const res = await addSavedPerson(req);
    set((s) => ({ savedPeople: [res.data, ...s.savedPeople] }));
    return res.data;
  },

  removePerson: async (personId, userId) => {
    await deleteSavedPerson(personId, userId);
    set((s) => ({ savedPeople: s.savedPeople.filter((p) => p.id !== personId) }));
  },

  analyze: async (userId, savedPersonId, type, locale) => {
    return get().analyzePair({ userId, savedPersonId, relationshipType: type, locale });
  },

  analyzePair: async (req) => {
    set({ isAnalyzing: true, currentSynastry: null, error: null });
    try {
      const res = await analyzeSynastry(req);
      set({ currentSynastry: res.data, isAnalyzing: false });
      return res.data;
    } catch (e: any) {
      set({ error: e?.message ?? 'Analiz başlatılamadı', isAnalyzing: false });
      throw e;
    }
  },

  pollSynastry: async (synastryId) => {
    const maxAttempts = 20;
    const delayMs = 3000;

    for (let i = 0; i < maxAttempts; i++) {
      const res = await getSynastry(synastryId);
      const data = res.data;

      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        set({ currentSynastry: data });
        return data;
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Return whatever we have after timeout
    const final = (await getSynastry(synastryId)).data;
    set({ currentSynastry: final });
    return final;
  },

  clearSynastry: () => set({ currentSynastry: null }),
  clearError: () => set({ error: null }),
}));
