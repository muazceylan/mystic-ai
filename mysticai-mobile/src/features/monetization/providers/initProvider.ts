import { Platform } from 'react-native';
import { setAdProvider } from './AdProviderAdapter';
import { isAdMobAvailable, initializeAdMob } from './admobInit';
import { AdMobRewardedProvider } from './AdMobRewardedProvider';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';

let initialized = false;

/**
 * Selects and initializes the correct ad provider based on runtime environment.
 *
 * - Native build (dev/prod) → AdMobRewardedProvider + SDK init
 * - Expo Go / web → keeps default StubAdProvider
 *
 * Safe to call multiple times; only runs once.
 *
 * @param adsEnabled Whether ads are enabled in monetization config.
 *   If false, provider is still set up but SDK init is deferred.
 */
export async function initializeAdProvider(adsEnabled: boolean): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (Platform.OS === 'web') {
    if (__DEV__) {
      console.log('[AdProvider] Web platform — using stub provider');
    }
    return;
  }

  if (!isAdMobAvailable()) {
    if (__DEV__) {
      console.warn(
        '[AdProvider] AdMob native module not available (Expo Go?). Using stub provider.\n' +
        'To use real ads, create a development build: npx expo run:android / npx expo run:ios',
      );
    }
    trackMonetizationEvent('ad_provider_fallback', {
      reason: 'native_module_unavailable',
      platform: Platform.OS,
    });
    return;
  }

  // Native build — use real AdMob provider
  const provider = new AdMobRewardedProvider();
  setAdProvider(provider);

  if (__DEV__) {
    console.log('[AdProvider] AdMob provider set');
  }

  // Initialize SDK if ads are enabled
  if (adsEnabled) {
    await initializeAdMob();
  } else if (__DEV__) {
    console.log('[AdProvider] Ads disabled in config — deferring SDK init');
  }
}
