import { create } from 'zustand';
import {
  AppConfig,
  DeeplinkAccessResult,
  fetchAppConfig,
  isModuleVisible,
  isModuleInMaintenance,
  getVisibleTabs,
  canOpenViaDeeplink,
} from '../services/appConfig.service';

interface AppConfigState {
  config: AppConfig | null;
  loading: boolean;
  lastFetchedAt: number;

  /** Fetch config from server. Falls back to defaults on error. */
  loadConfig: () => Promise<void>;
  /** Reload unconditionally (bypasses cache check in service). */
  refresh: () => Promise<void>;

  // Convenience selectors
  isModuleVisible: (moduleKey: string) => boolean;
  isModuleInMaintenance: (moduleKey: string) => boolean;
  getVisibleTabs: (platform: 'IOS' | 'ANDROID') => ReturnType<typeof getVisibleTabs>;
  /**
   * Returns whether the module can be navigated to via deeplink.
   * Returns { allowed: true } even for hiddenButDeepLinkable modules.
   * Returns { allowed: false, reason } for inactive or maintenance modules.
   */
  canOpenViaDeeplink: (moduleKey: string) => DeeplinkAccessResult;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  config: null,
  loading: false,
  lastFetchedAt: 0,

  loadConfig: async () => {
    const { loading, lastFetchedAt } = get();
    if (loading) return;
    // Don't re-fetch within 60 seconds
    if (Date.now() - lastFetchedAt < 60_000 && get().config !== null) return;

    set({ loading: true });
    try {
      const config = await fetchAppConfig();
      set({ config, lastFetchedAt: Date.now(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  refresh: async () => {
    set({ loading: true, lastFetchedAt: 0 });
    try {
      const config = await fetchAppConfig();
      set({ config, lastFetchedAt: Date.now(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  isModuleVisible: (moduleKey: string) => {
    const { config } = get();
    if (!config) return true; // default to visible while loading
    return isModuleVisible(config, moduleKey);
  },

  isModuleInMaintenance: (moduleKey: string) => {
    const { config } = get();
    if (!config) return false;
    return isModuleInMaintenance(config, moduleKey);
  },

  getVisibleTabs: (platform: 'IOS' | 'ANDROID') => {
    const { config } = get();
    if (!config) return [];
    return getVisibleTabs(config, platform);
  },

  canOpenViaDeeplink: (moduleKey: string) => {
    const { config } = get();
    // While config is loading, allow all deeplinks (don't block navigation on startup)
    if (!config) return { allowed: true };
    return canOpenViaDeeplink(config, moduleKey);
  },
}));
