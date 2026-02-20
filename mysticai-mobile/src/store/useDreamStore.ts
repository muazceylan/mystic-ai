import { create } from 'zustand';
import {
  DreamEntryResponse,
  DreamSymbol,
  DreamAnalyticsResponse,
  CollectivePulseResponse,
  MonthlyStoryResponse,
  dreamService,
} from '../services/dream.service';
import i18n from '../i18n';

interface DreamStore {
  dreams: DreamEntryResponse[];
  symbols: DreamSymbol[];
  analytics: DreamAnalyticsResponse | null;
  collectivePulse: CollectivePulseResponse | null;
  monthlyStory: MonthlyStoryResponse | null;
  loading: boolean;
  submitting: boolean;
  transcribing: boolean;
  analyticsLoading: boolean;
  pulseLoading: boolean;
  storyLoading: boolean;
  error: string | null;

  fetchDreams: (userId: number) => Promise<void>;
  fetchSymbols: (userId: number) => Promise<void>;
  submitDream: (userId: number, text: string, dreamDate: string, title?: string) => Promise<DreamEntryResponse>;
  transcribeAudio: (audioUri: string) => Promise<string>;
  deleteDream: (dreamId: number) => Promise<void>;
  pollUntilComplete: (dreamId: number) => void;
  updateDreamStatus: (dreamId: number, updated: DreamEntryResponse) => void;
  fetchAnalytics: (userId: number) => Promise<void>;
  fetchCollectivePulse: () => Promise<void>;
  fetchMonthlyStory: (userId: number, year: number, month: number) => Promise<void>;
  generateMonthlyStory: (userId: number, year: number, month: number, force?: boolean) => Promise<void>;
  pollStoryUntilComplete: (userId: number, year: number, month: number) => void;
  clearError: () => void;
}

export const useDreamStore = create<DreamStore>((set, get) => ({
  dreams: [],
  symbols: [],
  analytics: null,
  collectivePulse: null,
  monthlyStory: null,
  loading: false,
  submitting: false,
  transcribing: false,
  analyticsLoading: false,
  pulseLoading: false,
  storyLoading: false,
  error: null,

  fetchDreams: async (userId) => {
    set({ loading: true, error: null });
    try {
      const dreams = await dreamService.getDreamsByUser(userId);
      set({ dreams, loading: false });
      // Restart polling for any dreams that are still PENDING
      dreams
        .filter(d => d.interpretationStatus === 'PENDING')
        .forEach(d => get().pollUntilComplete(d.id));
    } catch (e: any) {
      set({ loading: false, error: e.message ?? 'Rüyalar yüklenemedi' });
    }
  },

  fetchSymbols: async (userId) => {
    try {
      const symbols = await dreamService.getSymbolsByUser(userId);
      set({ symbols });
    } catch { /* supplementary */ }
  },

  submitDream: async (userId, text, dreamDate, title) => {
    set({ submitting: true, error: null });
    try {
      // Pass current i18n language as locale so AI responds in the correct language
      const locale = i18n.language ?? 'tr';
      const result = await dreamService.submitDream({ userId, text, dreamDate, title, locale });
      set(s => ({ submitting: false, dreams: [result, ...s.dreams] }));
      return result;
    } catch (e: any) {
      set({ submitting: false, error: e.message ?? 'Rüya kaydedilemedi' });
      throw e;
    }
  },

  transcribeAudio: async (audioUri) => {
    set({ transcribing: true, error: null });
    try {
      const text = await dreamService.transcribeAudio(audioUri);
      set({ transcribing: false });
      return text;
    } catch (e: any) {
      set({ transcribing: false, error: e.message ?? 'Ses çözümlenemedi' });
      throw e;
    }
  },

  deleteDream: async (dreamId) => {
    try {
      await dreamService.deleteDream(dreamId);
      set(s => ({ dreams: s.dreams.filter(d => d.id !== dreamId) }));
    } catch (e: any) {
      set({ error: e.message ?? 'Rüya silinemedi' });
      throw e;
    }
  },

  pollUntilComplete: (dreamId) => {
    const MAX = 40; // 2 minutes (40 × 3s)
    let count = 0;
    const iv = setInterval(async () => {
      count++;
      try {
        const updated = await dreamService.getDreamById(dreamId);
        get().updateDreamStatus(dreamId, updated);
        if (updated.interpretationStatus !== 'PENDING' || count >= MAX) clearInterval(iv);
      } catch {
        if (count >= MAX) clearInterval(iv);
      }
    }, 3000);
  },

  updateDreamStatus: (dreamId, updated) => {
    set(s => ({ dreams: s.dreams.map(d => d.id === dreamId ? updated : d) }));
  },

  fetchAnalytics: async (userId) => {
    set({ analyticsLoading: true });
    try {
      const analytics = await dreamService.getAnalytics(userId);
      set({ analytics, analyticsLoading: false });
    } catch {
      set({ analyticsLoading: false });
    }
  },

  fetchCollectivePulse: async () => {
    set({ pulseLoading: true });
    try {
      const collectivePulse = await dreamService.getCollectivePulse();
      set({ collectivePulse, pulseLoading: false });
    } catch {
      set({ pulseLoading: false });
    }
  },

  fetchMonthlyStory: async (userId, year, month) => {
    set({ storyLoading: true });
    try {
      const monthlyStory = await dreamService.getMonthlyStory(userId, year, month);
      set({ monthlyStory, storyLoading: false });
    } catch {
      set({ storyLoading: false });
    }
  },

  generateMonthlyStory: async (userId, year, month, force = false) => {
    set({ storyLoading: true });
    try {
      const monthlyStory = await dreamService.generateMonthlyStory(userId, year, month, force);
      set({ monthlyStory, storyLoading: false });
    } catch (e: any) {
      set({ storyLoading: false, error: e.message ?? 'Hikâye oluşturulamadı' });
      throw e;
    }
  },

  pollStoryUntilComplete: (userId, year, month) => {
    const MAX = 20;
    let count = 0;
    const iv = setInterval(async () => {
      count++;
      try {
        const story = await dreamService.getMonthlyStory(userId, year, month);
        if (story) {
          set({ monthlyStory: story });
          if (story.status !== 'PENDING' || count >= MAX) clearInterval(iv);
        } else if (count >= MAX) {
          clearInterval(iv);
        }
      } catch {
        if (count >= MAX) clearInterval(iv);
      }
    }, 3000);
  },

  clearError: () => set({ error: null }),
}));
