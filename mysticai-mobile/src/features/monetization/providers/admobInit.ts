import { Platform } from 'react-native';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import type { RequestConfiguration } from './googleMobileAdsRuntime.shared';
import { getGoogleMobileAdsModule } from './googleMobileAdsRuntime';

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
  return getGoogleMobileAdsModule('availability check') !== null;
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
    const googleMobileAds = getGoogleMobileAdsModule('SDK initialization');
    if (!googleMobileAds) {
      return false;
    }

    // Set request configuration before initializing
    const requestConfig: RequestConfiguration = {
      maxAdContentRating: googleMobileAds.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    };

    if (testDeviceIds?.length) {
      requestConfig.testDeviceIdentifiers = testDeviceIds;
    }

    await googleMobileAds.default().setRequestConfiguration(requestConfig);
    const adapterStatuses = await googleMobileAds.default().initialize();

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
