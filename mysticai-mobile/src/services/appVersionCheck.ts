import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import api from './api';

export interface AppVersionResponse {
  platform: string;
  forceUpdate: boolean;
  minSupportedVersion: string;
  latestVersion: string;
  message: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  androidWebStoreUrl: string | null;
}

/** Compares two semantic version strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 *  Missing segments are treated as 0: "1.0" equals "1.0.0". */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map((p) => parseInt(p, 10) || 0);
  const bParts = b.split('.').map((p) => parseInt(p, 10) || 0);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

export function getCurrentAppVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}

export async function fetchAppVersionInfo(platform: string): Promise<AppVersionResponse | null> {
  try {
    const response = await api.get<AppVersionResponse>('/api/v1/app-version', {
      params: { platform },
    });
    return response.data;
  } catch (error) {
    console.warn('[AppVersionCheck] Failed to fetch version info:', error);
    return null;
  }
}

export function isUpdateRequired(versionInfo: AppVersionResponse, currentVersion: string): boolean {
  if (!versionInfo.forceUpdate) return false;
  return compareVersions(currentVersion, versionInfo.minSupportedVersion) < 0;
}

export async function checkAppVersion(): Promise<{
  updateRequired: boolean;
  versionInfo: AppVersionResponse | null;
  currentVersion: string;
}> {
  const currentVersion = getCurrentAppVersion();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const versionInfo = await fetchAppVersionInfo(platform);

  if (!versionInfo) {
    return { updateRequired: false, versionInfo: null, currentVersion };
  }

  const updateRequired = isUpdateRequired(versionInfo, currentVersion);
  return { updateRequired, versionInfo, currentVersion };
}

export async function openStore(versionInfo: AppVersionResponse): Promise<void> {
  const platform = Platform.OS;

  if (platform === 'ios') {
    if (versionInfo.iosStoreUrl) {
      try {
        await Linking.openURL(versionInfo.iosStoreUrl);
      } catch (e) {
        console.warn('[AppVersionCheck] Failed to open iOS store URL:', e);
      }
    }
    return;
  }

  if (platform === 'android') {
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

    if (versionInfo.androidWebStoreUrl) {
      try {
        await Linking.openURL(versionInfo.androidWebStoreUrl);
      } catch (e) {
        console.warn('[AppVersionCheck] Failed to open Android web store URL:', e);
      }
    }
  }
}
