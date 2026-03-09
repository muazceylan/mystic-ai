import axios from 'axios/dist/browser/axios.cjs';
import { envConfig } from '../config/env';

export interface ModuleConfig {
  moduleKey: string;
  displayName: string;
  icon: string | null;
  isActive: boolean;
  isPremium: boolean;
  showOnHome: boolean;
  showOnExplore: boolean;
  showInTabBar: boolean;
  sortOrder: number;
  maintenanceMode: boolean;
  hiddenButDeepLinkable: boolean;
  badgeLabel: string | null;
}

export interface NavConfig {
  navKey: string;
  label: string;
  icon: string | null;
  routeKey: string;
  isVisible: boolean;
  sortOrder: number;
  platform: 'IOS' | 'ANDROID' | 'BOTH';
  isPremium: boolean;
  minAppVersion: string | null;
}

export interface AppConfig {
  version: string;
  fetchedAt: string;
  activeModules: ModuleConfig[];
  visibleTabs: NavConfig[];
  maintenanceFlags: string[];
}

const CONFIG_ENDPOINT = `${envConfig.apiBaseUrl}/api/v1/app-config`;

let cachedConfig: AppConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute — matches backend Cache-Control

/** Local fallback if server is unreachable. Mirrors the seeded defaults. */
export const DEFAULT_CONFIG: AppConfig = {
  version: '0.0-fallback',
  fetchedAt: new Date().toISOString(),
  maintenanceFlags: [],
  activeModules: [
    { moduleKey: 'home', displayName: 'Ana Sayfa', icon: 'home', isActive: true, isPremium: false, showOnHome: true, showOnExplore: false, showInTabBar: true, sortOrder: 0, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'daily_transits', displayName: 'Günlük Transitler', icon: 'sun', isActive: true, isPremium: false, showOnHome: true, showOnExplore: true, showInTabBar: false, sortOrder: 1, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'dream_analysis', displayName: 'Rüya Analizi', icon: 'moon', isActive: true, isPremium: false, showOnHome: true, showOnExplore: true, showInTabBar: true, sortOrder: 3, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'spiritual', displayName: 'Manevi Alan', icon: 'heart', isActive: true, isPremium: false, showOnHome: true, showOnExplore: true, showInTabBar: true, sortOrder: 4, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'compatibility', displayName: 'Uyumluluk', icon: 'link', isActive: true, isPremium: false, showOnHome: true, showOnExplore: true, showInTabBar: true, sortOrder: 5, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'notifications', displayName: 'Bildirimler', icon: 'bell', isActive: true, isPremium: false, showOnHome: false, showOnExplore: false, showInTabBar: true, sortOrder: 9, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
    { moduleKey: 'profile', displayName: 'Profil', icon: 'user', isActive: true, isPremium: false, showOnHome: false, showOnExplore: false, showInTabBar: true, sortOrder: 10, maintenanceMode: false, hiddenButDeepLinkable: false, badgeLabel: null },
  ],
  visibleTabs: [
    { navKey: 'home', label: 'Ana Sayfa', icon: 'home', routeKey: 'home', isVisible: true, sortOrder: 0, platform: 'BOTH', isPremium: false, minAppVersion: null },
    { navKey: 'dreams', label: 'Rüyalar', icon: 'moon', routeKey: 'dreams', isVisible: true, sortOrder: 1, platform: 'BOTH', isPremium: false, minAppVersion: null },
    { navKey: 'spiritual', label: 'Manevi', icon: 'heart', routeKey: 'spiritual', isVisible: true, sortOrder: 2, platform: 'BOTH', isPremium: false, minAppVersion: null },
    { navKey: 'compatibility', label: 'Uyumluluk', icon: 'users', routeKey: 'compatibility', isVisible: true, sortOrder: 4, platform: 'BOTH', isPremium: false, minAppVersion: null },
    { navKey: 'profile', label: 'Profil', icon: 'user', routeKey: 'profile', isVisible: true, sortOrder: 6, platform: 'BOTH', isPremium: false, minAppVersion: null },
  ],
};

export async function fetchAppConfig(): Promise<AppConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    const response = await axios.get<AppConfig>(CONFIG_ENDPOINT, { timeout: 5000 });
    cachedConfig = response.data;
    cacheTimestamp = now;
    return cachedConfig;
  } catch (err) {
    console.warn('[AppConfig] Failed to fetch config, using defaults:', err);
    return cachedConfig ?? DEFAULT_CONFIG;
  }
}

export function getModuleConfig(config: AppConfig, moduleKey: string): ModuleConfig | undefined {
  return config.activeModules.find(m => m.moduleKey === moduleKey);
}

export function isModuleActive(config: AppConfig, moduleKey: string): boolean {
  const m = getModuleConfig(config, moduleKey);
  return m?.isActive ?? true; // default to showing if config is missing
}

export function isModuleInMaintenance(config: AppConfig, moduleKey: string): boolean {
  return config.maintenanceFlags.includes(moduleKey);
}

export function isModuleVisible(config: AppConfig, moduleKey: string): boolean {
  const m = getModuleConfig(config, moduleKey);
  if (!m) return true; // show by default if config missing
  if (!m.isActive) return false;
  if (m.hiddenButDeepLinkable) return false;
  return true;
}

export function getVisibleTabs(config: AppConfig, platform: 'IOS' | 'ANDROID'): NavConfig[] {
  return config.visibleTabs
    .filter(t => t.isVisible && (t.platform === 'BOTH' || t.platform === platform))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Result of resolving deeplink access for a module.
 * - allowed: module can be opened via deeplink (active, not in maintenance)
 * - inactive: module is disabled — block deeplink
 * - maintenance: module is temporarily unavailable — show maintenance screen
 * - not_found: module key not in config — treat as fallback
 */
export type DeeplinkAccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'inactive' | 'maintenance' | 'not_found' };

/**
 * Determines if a module can be opened via deeplink.
 *
 * Key difference from isModuleVisible():
 * - isModuleVisible()    → false for hiddenButDeepLinkable (UI display decision)
 * - canOpenViaDeeplink() → true  for hiddenButDeepLinkable (deeplink is intentionally allowed)
 *
 * Behavior matrix:
 * | isActive | hiddenButDeepLinkable | maintenanceMode | Result           |
 * |----------|-----------------------|-----------------|------------------|
 * | true     | false                 | false           | allowed          |
 * | true     | true                  | false           | allowed (hidden from UI but deeplink ok) |
 * | true     | any                   | true            | maintenance      |
 * | false    | any                   | any             | inactive         |
 * | -        | -                     | -               | not_found        |
 */
export function canOpenViaDeeplink(config: AppConfig, moduleKey: string): DeeplinkAccessResult {
  const m = getModuleConfig(config, moduleKey);
  if (!m) return { allowed: false, reason: 'not_found' };
  if (!m.isActive) return { allowed: false, reason: 'inactive' };
  if (m.maintenanceMode) return { allowed: false, reason: 'maintenance' };
  // hiddenButDeepLinkable: hidden from UI but deeplink is explicitly allowed
  return { allowed: true };
}

/**
 * Whether a module should be shown in any UI surface (home / explore / tab bar).
 * Returns false for hiddenButDeepLinkable modules even if they're active.
 */
export function isModuleVisibleInUI(config: AppConfig, moduleKey: string): boolean {
  const m = getModuleConfig(config, moduleKey);
  if (!m) return true; // show by default if config missing (safe while loading)
  if (!m.isActive) return false;
  if (m.hiddenButDeepLinkable) return false;
  return true;
}
