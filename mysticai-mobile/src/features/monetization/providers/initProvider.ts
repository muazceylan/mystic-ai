import { Platform } from 'react-native';
import { setAdProvider } from './AdProviderAdapter';
import { isAdMobAvailable, isAdMobInitialized } from './admobInit';
import { AdMobRewardedProvider } from './AdMobRewardedProvider';
import { LevelPlayRewardedProvider } from './LevelPlayRewardedProvider';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import type { AdsInitializationOptions } from './mobileAds.types';
import { getConfiguredMobileAdProvider } from './providerConfig';
import { envConfig } from '../../../config/env';

/**
 * Privacy-safe options for a late init that runs before (or without) the root
 * privacy gate: no personalization, which is what an unresolved consent state
 * must mean.
 */
const FALLBACK_INIT_OPTIONS: AdsInitializationOptions = {
  trackingConsentStatus: 'unavailable',
  personalizedAdvertisingAllowed: false,
  tagForChildDirectedTreatment: false,
};

let initPromise: Promise<void> | null = null;
let levelPlayProvider: LevelPlayRewardedProvider | null = null;
let adMobProvider: AdMobRewardedProvider | null = null;
// Last bootstrap arguments, kept so the SDK can still be brought up later.
// The startup bootstrap runs with whatever monetization config it managed to
// fetch; when that fetch failed, `adsEnabled` was false and SDK init was
// deferred. Ads may become enabled afterwards (a later config refresh), and the
// user then taps an ad offer against an uninitialized SDK.
let lastOptions: AdsInitializationOptions | null = null;
let lastUserId: string | number | null | undefined;

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
  lastOptions = options;
  lastUserId = userId;
  if (initPromise) return initPromise;
  initPromise = doInitializeAdProvider(adsEnabled, options, userId).finally(() => {
    initPromise = null;
  });
  return initPromise;
}

/**
 * Brings the configured ad SDK up on demand, right before an ad is requested.
 *
 * The startup bootstrap is best-effort: it skips SDK init when monetization
 * config says ads are off, and that config can arrive late (or fail and arrive
 * only on the next foreground refresh). Without this the ad offer stays visible
 * and tapping it silently does nothing for the rest of the session.
 *
 * @returns true when the provider is ready to serve, false when it cannot be.
 */
export async function ensureAdProviderReady(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const configuredProvider = getConfiguredMobileAdProvider();
  if (configuredProvider === 'none') return false;
  // LevelPlay loads its own SDK lazily inside the provider.
  if (configuredProvider === 'levelplay') return true;

  if (isAdMobInitialized()) return true;
  if (!isAdMobAvailable()) return false;

  const options = lastOptions
    ?? { ...FALLBACK_INIT_OPTIONS, testDeviceIds: envConfig.admob.testDeviceIds };

  // Init the SDK directly rather than via initializeAdProvider(): a startup
  // bootstrap that is still in flight with adsEnabled=false would otherwise be
  // handed back by its single-flight guard and skip init again.
  const provider = adMobProvider ?? new AdMobRewardedProvider();
  adMobProvider = provider;
  setAdProvider(provider);
  await provider.initialize(options);

  return isAdMobInitialized();
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
    const provider = levelPlayProvider ?? new LevelPlayRewardedProvider();
    levelPlayProvider = provider;
    setAdProvider(provider);
    if (__DEV__) console.log('[AdProvider] LevelPlay provider set');
    if (adsEnabled) {
      await provider.initialize(options, userId);
    } else if (__DEV__) {
      console.log('[AdProvider] Ads disabled in config — deferring LevelPlay SDK init');
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
