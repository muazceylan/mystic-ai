import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { GoogleMobileAdsModule } from './googleMobileAdsRuntime.shared';

const NATIVE_MODULE_NAME = 'RNGoogleMobileAdsModule';

const FALLBACK_REWARDED_TEST_UNIT_ID =
  Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
  }) ?? 'ca-app-pub-3940256099942544/5224354917';

let cachedModule: GoogleMobileAdsModule | null | undefined;
let didWarnUnavailable = false;

function warnUnavailable(reason: string, error?: unknown): void {
  if (!__DEV__ || didWarnUnavailable) return;
  didWarnUnavailable = true;

  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'unknown error';

  console.warn(
    `[AdMob] react-native-google-mobile-ads unavailable during ${reason}. ` +
      'Expo Go or a stale native build will trigger this fallback. ' +
      'Create/rebuild the native app with expo run:* or EAS before testing real ads.',
    detail,
  );
}

export function getGoogleMobileAdsModule(reason = 'runtime access'): GoogleMobileAdsModule | null {
  if (Platform.OS === 'web') {
    cachedModule = null;
    return null;
  }

  if (cachedModule !== undefined) {
    return cachedModule;
  }

  const nativeModule =
    TurboModuleRegistry.get<unknown>(NATIVE_MODULE_NAME)
    ?? (NativeModules as Record<string, unknown>)[NATIVE_MODULE_NAME];

  if (!nativeModule) {
    cachedModule = null;
    warnUnavailable(reason, `${NATIVE_MODULE_NAME} native module missing`);
    return null;
  }

  try {
    cachedModule = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
    return cachedModule;
  } catch (error) {
    cachedModule = null;
    warnUnavailable(reason, error);
    return null;
  }
}

export function getRewardedTestAdUnitId(): string {
  return getGoogleMobileAdsModule('test ad unit resolution')?.TestIds.REWARDED
    ?? FALLBACK_REWARDED_TEST_UNIT_ID;
}
