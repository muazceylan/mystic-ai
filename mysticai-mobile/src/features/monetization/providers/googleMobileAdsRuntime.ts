import { Platform } from 'react-native';
import type { GoogleMobileAdsModule } from './googleMobileAdsRuntime.shared';

const FALLBACK_REWARDED_TEST_UNIT_ID =
  Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
  }) ?? 'ca-app-pub-3940256099942544/5224354917';

let didWarnUnavailable = false;

function warnUnavailable(reason: string): void {
  if (!__DEV__ || didWarnUnavailable) return;
  didWarnUnavailable = true;

  console.warn(
    `[AdMob] react-native-google-mobile-ads unavailable during ${reason}. ` +
      'Web builds use the stub provider and never load native AdMob modules.',
  );
}

export function getGoogleMobileAdsModule(reason = 'runtime access'): GoogleMobileAdsModule | null {
  warnUnavailable(reason);
  return null;
}

export function getRewardedTestAdUnitId(): string {
  return FALLBACK_REWARDED_TEST_UNIT_ID;
}
