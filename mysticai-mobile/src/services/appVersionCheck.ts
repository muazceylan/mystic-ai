import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import i18n from '../i18n';
import { resolveUpdateStatus } from './appVersionPolicy';
import type { AppUpdateStatus, AppVersionResponse } from './appVersionPolicy';

export type { AppUpdateStatus, AppVersionResponse };
export {
  compareVersions,
  evaluateStatusLocally,
  resolveUpdateStatus,
} from './appVersionPolicy';

export interface AppVersionCheckResult {
  status: AppUpdateStatus;
  versionInfo: AppVersionResponse | null;
  installedVersion: string;
  installedBuild: number | null;
}

const OPTIONAL_DISMISS_KEY = 'mysticai_update_prompt_dismissed_build';

/**
 * Installed version/build come from the native package only — Android versionName/versionCode
 * and iOS CFBundleShortVersionString/CFBundleVersion. They are never duplicated in TS, env,
 * backend config, or the admin panel, so a release bump is the single place a version changes.
 */
export function getCurrentAppVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}

export function getCurrentAppBuild(): number | null {
  const raw = Application.nativeBuildVersion;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchAppVersionInfo(
  platform: string,
  installedVersion?: string,
  installedBuild?: number | null,
): Promise<AppVersionResponse | null> {
  try {
    const response = await api.get<AppVersionResponse>('/api/v1/app-version', {
      params: {
        platform,
        installedVersion,
        installedBuild: installedBuild ?? undefined,
        locale: i18n.language ?? undefined,
      },
    });
    return response.data;
  } catch (error) {
    console.warn('[AppVersionCheck] Failed to fetch version info:', error);
    return null;
  }
}

/** Kept for callers that only need the blocking decision. */
export function isUpdateRequired(
  versionInfo: AppVersionResponse,
  installedVersion: string,
  installedBuild: number | null = getCurrentAppBuild(),
): boolean {
  return resolveUpdateStatus(versionInfo, installedVersion, installedBuild) === 'FORCE_UPDATE';
}

/**
 * Fail-safe: a timeout, 5xx, or offline device resolves to UP_TO_DATE. A backend outage must
 * never turn into an app-wide lockout or a permanent loading screen.
 */
export async function checkAppVersion(): Promise<AppVersionCheckResult> {
  const installedVersion = getCurrentAppVersion();
  const installedBuild = getCurrentAppBuild();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const versionInfo = await fetchAppVersionInfo(platform, installedVersion, installedBuild);

  if (!versionInfo) {
    return { status: 'UP_TO_DATE', versionInfo: null, installedVersion, installedBuild };
  }

  return {
    status: resolveUpdateStatus(versionInfo, installedVersion, installedBuild),
    versionInfo,
    installedVersion,
    installedBuild,
  };
}

/** Optional prompts are dismissed per latest build, so a user is nudged once per release. */
export async function isOptionalUpdateDismissed(latestBuild: number | undefined): Promise<boolean> {
  if (latestBuild == null) return false;
  try {
    const stored = await AsyncStorage.getItem(OPTIONAL_DISMISS_KEY);
    return stored != null && Number(stored) === latestBuild;
  } catch {
    return false;
  }
}

export async function dismissOptionalUpdate(latestBuild: number | undefined): Promise<void> {
  if (latestBuild == null) return;
  try {
    await AsyncStorage.setItem(OPTIONAL_DISMISS_KEY, String(latestBuild));
  } catch (error) {
    console.warn('[AppVersionCheck] Failed to persist update dismissal:', error);
  }
}

export async function openStore(versionInfo: AppVersionResponse): Promise<void> {
  const platform = Platform.OS;

  if (platform === 'ios') {
    const iosUrl = versionInfo.iosStoreUrl ?? versionInfo.storeUrl;
    if (iosUrl) {
      try {
        await Linking.openURL(iosUrl);
      } catch (e) {
        console.warn('[AppVersionCheck] Failed to open iOS store URL:', e);
      }
    }
    return;
  }

  if (platform === 'android') {
    // market:// opens the Play app directly; fall back to the https listing when unavailable.
    if (versionInfo.androidStoreUrl) {
      try {
        const canOpen = await Linking.canOpenURL(versionInfo.androidStoreUrl);
        if (canOpen) {
          await Linking.openURL(versionInfo.androidStoreUrl);
          return;
        }
      } catch {
        // market:// failed, fall through to web URL
      }
    }

    const webUrl = versionInfo.androidWebStoreUrl ?? versionInfo.storeUrl;
    if (webUrl) {
      try {
        await Linking.openURL(webUrl);
      } catch (e) {
        console.warn('[AppVersionCheck] Failed to open Android web store URL:', e);
      }
    }
  }
}
