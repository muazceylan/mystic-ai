import { Platform } from 'react-native';
import { setAdProvider } from './AdProviderAdapter';
import { isAdMobAvailable } from './admobInit';
import { AdMobRewardedProvider } from './AdMobRewardedProvider';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import type { AdsInitializationOptions } from './mobileAds.types';
import { getConfiguredMobileAdProvider } from './providerConfig';

let initPromise: Promise<void> | null = null;
let levelPlayProvider: import('./LevelPlayRewardedProvider').LevelPlayRewardedProvider | null = null;
let adMobProvider: AdMobRewardedProvider | null = null;

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
export async function initializeAdProvider(
  adsEnabled: boolean,
  options: AdsInitializationOptions,
  userId?: string | number | null,
): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = doInitializeAdProvider(adsEnabled, options, userId).finally(() => {
    initPromise = null;
  });
  return initPromise;
}

async function doInitializeAdProvider(
  adsEnabled: boolean,
  options: AdsInitializationOptions,
  userId?: string | number | null,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (__DEV__) {
      console.log('[AdProvider] Web platform — using stub provider');
    }
    return;
  }

  const configuredProvider = getConfiguredMobileAdProvider();
  if (configuredProvider === 'none') {
    if (__DEV__) console.log('[AdProvider] Provider disabled by configuration');
    return;
  }
  if (configuredProvider !== 'admob' && configuredProvider !== 'levelplay') {
    console.warn(
      `[AdProvider] "${configuredProvider}" is not implemented; falling back to AdMob.`,
    );
  }

  if (configuredProvider === 'levelplay') {
    const { LevelPlayRewardedProvider } = require('./LevelPlayRewardedProvider') as typeof import('./LevelPlayRewardedProvider');
    const provider = levelPlayProvider ?? new LevelPlayRewardedProvider();
    levelPlayProvider = provider;
    setAdProvider(provider);
    if (adsEnabled) {
      await provider.initialize(options, userId);
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
  const provider = adMobProvider ?? new AdMobRewardedProvider();
  adMobProvider = provider;
  setAdProvider(provider);

  if (__DEV__) {
    console.log('[AdProvider] AdMob provider set');
  }

  // Initialize SDK if ads are enabled
  if (adsEnabled) {
    await provider.initialize(options);
  } else if (__DEV__) {
    console.log('[AdProvider] Ads disabled in config — deferring SDK init');
  }
}
