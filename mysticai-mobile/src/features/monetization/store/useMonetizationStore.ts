import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { MonetizationConfig, ModuleRule, ActionConfig, AdExposureState } from '../types';
import { fetchMonetizationConfig, clearMonetizationCache } from '../api/monetization.service';

const EXPOSURE_STORAGE_KEY = 'monetization_exposure_state';

interface PersistedExposureData {
  exposureState: Record<string, AdExposureState>;
  savedAt: number;
}

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function isSameWeek(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  // ISO week: Monday-based week comparison
  const getWeek = (d: Date) => {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  };
  return d1.getFullYear() === d2.getFullYear() && getWeek(d1) === getWeek(d2);
}

function resetExpiredCounts(
  state: Record<string, AdExposureState>,
  savedAt: number,
): Record<string, AdExposureState> {
  const now = Date.now();
  const result: Record<string, AdExposureState> = {};
  for (const [key, exposure] of Object.entries(state)) {
    result[key] = {
      ...exposure,
      dailyOfferCount: isSameDay(savedAt, now) ? exposure.dailyOfferCount : 0,
      weeklyOfferCount: isSameWeek(savedAt, now) ? exposure.weeklyOfferCount : 0,
    };
  }
  return result;
}

async function persistExposure(exposureState: Record<string, AdExposureState>): Promise<void> {
  try {
    const data: PersistedExposureData = { exposureState, savedAt: Date.now() };
    await AsyncStorage.setItem(EXPOSURE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort persistence
  }
}

async function restoreExposure(): Promise<Record<string, AdExposureState> | null> {
  try {
    const raw = await AsyncStorage.getItem(EXPOSURE_STORAGE_KEY);
    if (!raw) return null;
    const data: PersistedExposureData = JSON.parse(raw);
    if (!data.exposureState) return null;
    // Reset daily/weekly counts if date/week boundary crossed
    return resetExpiredCounts(data.exposureState, data.savedAt);
  } catch {
    return null;
  }
}

interface MonetizationState {
  config: MonetizationConfig | null;
  loading: boolean;
  lastFetchedAt: number;
  exposureState: Record<string, AdExposureState>;

  loadConfig: () => Promise<void>;
  refresh: () => Promise<void>;

  getModuleRule: (moduleKey: string) => ModuleRule | undefined;
  getAction: (actionKey: string, moduleKey: string) => ActionConfig | undefined;
  isMonetizationEnabled: () => boolean;
  isAdsEnabledForModule: (moduleKey: string) => boolean;
  isGuruEnabledForModule: (moduleKey: string) => boolean;

  trackModuleEntry: (moduleKey: string) => void;
  trackAdOffer: (moduleKey: string) => void;
  trackAdCompleted: (moduleKey: string) => void;
  getExposureState: (moduleKey: string) => AdExposureState;

  shouldShowAdOffer: (moduleKey: string) => boolean;
  clearExposure: () => void;
}

const CACHE_WINDOW = 60_000;

const createDefaultExposure = (moduleKey: string): AdExposureState => ({
  moduleKey,
  entryCount: 0,
  dailyOfferCount: 0,
  weeklyOfferCount: 0,
  sessionCount: 0,
});

function isAdsEnabledForCurrentPlatform(config: MonetizationConfig, rule: ModuleRule | undefined): boolean {
  if (!config.enabled || !config.adsEnabled) {
    return false;
  }

  if (!rule?.enabled || !rule.adsEnabled) {
    return false;
  }

  if (Platform.OS === 'web' && !config.webAdsEnabled) {
    return false;
  }

  return true;
}

export const useMonetizationStore = create<MonetizationState>((set, get) => ({
  config: null,
  loading: false,
  lastFetchedAt: 0,
  exposureState: {},

  loadConfig: async () => {
    const now = Date.now();
    if (get().loading) return;
    if (now - get().lastFetchedAt < CACHE_WINDOW && get().config !== null) return;

    set({ loading: true });
    try {
      const config = await fetchMonetizationConfig();
      // Restore persisted exposure state if current state is empty
      const currentExposure = get().exposureState;
      if (Object.keys(currentExposure).length === 0) {
        const restored = await restoreExposure();
        if (restored) {
          set({ config, lastFetchedAt: now, loading: false, exposureState: restored });
          return;
        }
      }
      set({ config, lastFetchedAt: now, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  refresh: async () => {
    clearMonetizationCache();
    set({ loading: true, lastFetchedAt: 0 });
    try {
      const config = await fetchMonetizationConfig();
      set({ config, lastFetchedAt: Date.now(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  getModuleRule: (moduleKey: string) => {
    return get().config?.moduleRules.find(r => r.moduleKey === moduleKey);
  },

  getAction: (actionKey: string, moduleKey: string) => {
    return get().config?.actions.find(a => a.actionKey === actionKey && a.moduleKey === moduleKey);
  },

  isMonetizationEnabled: () => {
    return get().config?.enabled ?? false;
  },

  isAdsEnabledForModule: (moduleKey: string) => {
    const config = get().config;
    if (!config) return false;
    const rule = get().getModuleRule(moduleKey);
    return isAdsEnabledForCurrentPlatform(config, rule);
  },

  isGuruEnabledForModule: (moduleKey: string) => {
    const config = get().config;
    if (!config?.enabled || !config.guruEnabled) return false;
    const rule = get().getModuleRule(moduleKey);
    return rule?.enabled === true && rule?.guruEnabled === true;
  },

  trackModuleEntry: (moduleKey: string) => {
    set(state => {
      const existing = state.exposureState[moduleKey] ?? createDefaultExposure(moduleKey);
      const updated = {
        ...state.exposureState,
        [moduleKey]: { ...existing, entryCount: existing.entryCount + 1 },
      };
      void persistExposure(updated);
      return { exposureState: updated };
    });
  },

  trackAdOffer: (moduleKey: string) => {
    set(state => {
      const existing = state.exposureState[moduleKey] ?? createDefaultExposure(moduleKey);
      const updated = {
        ...state.exposureState,
        [moduleKey]: {
          ...existing,
          dailyOfferCount: existing.dailyOfferCount + 1,
          weeklyOfferCount: existing.weeklyOfferCount + 1,
          lastOfferAt: Date.now(),
        },
      };
      void persistExposure(updated);
      return { exposureState: updated };
    });
  },

  trackAdCompleted: (moduleKey: string) => {
    set(state => {
      const existing = state.exposureState[moduleKey] ?? createDefaultExposure(moduleKey);
      const updated = {
        ...state.exposureState,
        [moduleKey]: { ...existing, lastCompletedAdAt: Date.now() },
      };
      void persistExposure(updated);
      return { exposureState: updated };
    });
  },

  getExposureState: (moduleKey: string) => {
    return get().exposureState[moduleKey] ?? createDefaultExposure(moduleKey);
  },

  shouldShowAdOffer: (moduleKey: string) => {
    const config = get().config;
    if (!config) return false;

    const rule = get().getModuleRule(moduleKey);
    if (!rule || !isAdsEnabledForCurrentPlatform(config, rule)) return false;

    const exposure = get().getExposureState(moduleKey);

    // Check entry count threshold
    if (exposure.entryCount < rule.adOfferStartEntry) return false;

    // Check daily cap
    if (exposure.dailyOfferCount >= rule.dailyOfferCap) return false;

    // Check weekly cap
    if (exposure.weeklyOfferCount >= rule.weeklyOfferCap) return false;

    // Check cooldown hours
    if (exposure.lastOfferAt) {
      const hoursSince = (Date.now() - exposure.lastOfferAt) / (1000 * 60 * 60);
      if (hoursSince < rule.minimumHoursBetweenOffers) return false;
    }

    // Check session count
    if (rule.minimumSessionsBetweenOffers > 1 && exposure.sessionCount < rule.minimumSessionsBetweenOffers) {
      return false;
    }

    return true;
  },

  clearExposure: () => {
    set({ exposureState: {} });
    void AsyncStorage.removeItem(EXPOSURE_STORAGE_KEY).catch(() => {});
  },
}));
