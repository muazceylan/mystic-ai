import { Platform } from 'react-native';
import mobileAds, {
  MaxAdContentRating,
  type RequestConfiguration,
} from 'react-native-google-mobile-ads';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';

let initPromise: Promise<boolean> | null = null;
let initSuccess = false;

/**
 * Whether the AdMob SDK has been successfully initialized.
 */
export function isAdMobInitialized(): boolean {
  return initSuccess;
}

/**
 * Checks whether the AdMob native module is available.
 * Returns false in Expo Go or web where native code is absent.
 */
export function isAdMobAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    // mobileAds() returns the AdMob module instance; if native module is
    // missing (Expo Go), accessing it will throw.
    return typeof mobileAds === 'function';
  } catch {
    return false;
  }
}

/**
 * Initializes the Google Mobile Ads SDK.
 * Safe to call multiple times — only runs once.
 *
 * @param testDeviceIds Optional list of test device IDs for request configuration.
 * @returns true if initialization succeeded, false otherwise.
 */
export async function initializeAdMob(testDeviceIds?: string[]): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = doInit(testDeviceIds);
  return initPromise;
}

async function doInit(testDeviceIds?: string[]): Promise<boolean> {
  if (!isAdMobAvailable()) {
    if (__DEV__) {
      console.warn(
        '[AdMob] Native module not available (Expo Go or web). Ads will use stub provider.',
      );
    }
    trackMonetizationEvent('admob_init_skipped', {
      reason: 'native_module_unavailable',
      platform: Platform.OS,
    });
    return false;
  }

  try {
    // Set request configuration before initializing
    const requestConfig: RequestConfiguration = {
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    };

    if (testDeviceIds?.length) {
      requestConfig.testDeviceIdentifiers = testDeviceIds;
    }

    await mobileAds().setRequestConfiguration(requestConfig);
    const adapterStatuses = await mobileAds().initialize();

    initSuccess = true;

    if (__DEV__) {
      console.log('[AdMob] SDK initialized successfully', adapterStatuses);
    }

    trackMonetizationEvent('admob_init_success', {
      platform: Platform.OS,
    });

    return true;
  } catch (error) {
    initSuccess = false;

    const message = error instanceof Error ? error.message : 'unknown';
    if (__DEV__) {
      console.error('[AdMob] SDK initialization failed:', message);
    }

    trackMonetizationEvent('admob_init_failed', {
      platform: Platform.OS,
      reason: message,
    });

    return false;
  }
}
