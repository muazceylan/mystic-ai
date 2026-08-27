import { Platform } from 'react-native';

import { envConfig } from '../../../config/env';
import { maskUnitId, resolveRewardedUnitId } from './admobUnitIds';
import { getAdMobAdapterStatuses, isAdMobAvailable, isAdMobInitialized } from './admobInit';
import { getGoogleMobileAdsModule } from './googleMobileAdsRuntime';
import { getAdProvider } from './AdProviderAdapter';
import { getConfiguredMobileAdProvider } from './providerConfig';
import type { AdapterStatus } from './googleMobileAdsRuntime.shared';

// Development-only helpers for inspecting the AdMob mediation setup on a real
// device. Nothing here participates in the production ad flow — the SDK is
// still initialized exactly once, from `initializeAdMob`.
//
// This module depends on admobInit/admobUnitIds and never the other way around,
// so the import graph stays acyclic (same rule as levelPlayDevTools).

export type AdMobAdapterSummary = {
  name: string;
  description: string;
  /** Google reports 1 = ready to serve, 0 = unlikely to fill. */
  ready: boolean;
};

export type AdMobDevToolsStatus = {
  /** False in production builds and on web — every helper is then a no-op. */
  enabled: boolean;
  /** Configured provider; the inspector is only meaningful when this is 'admob'. */
  provider: string;
  sdkAvailable: boolean;
  initialized: boolean;
  /** Masked in production mode — see `maskUnitId`. */
  rewardedUnitId: string | null;
  rewardedUnitMode: 'test' | 'production' | null;
  /** Count only; the raw IDs are never surfaced. */
  testDeviceIdCount: number;
  adapters: AdMobAdapterSummary[];
};

function summarize(statuses: AdapterStatus[]): AdMobAdapterSummary[] {
  return statuses.map((s) => ({
    name: s.name,
    description: s.description,
    ready: s.state === 1,
  }));
}

/** Snapshot for dev surfaces. Contains no secrets. */
export function getAdMobDevToolsStatus(): AdMobDevToolsStatus {
  const resolved = resolveRewardedUnitId();
  return {
    enabled: __DEV__ && Platform.OS !== 'web',
    provider: getConfiguredMobileAdProvider(),
    sdkAvailable: isAdMobAvailable(),
    initialized: isAdMobInitialized(),
    rewardedUnitId: resolved ? maskUnitId(resolved.unitId, resolved.mode) : null,
    rewardedUnitMode: resolved?.mode ?? null,
    testDeviceIdCount: envConfig.admob.testDeviceIds.length,
    adapters: summarize(getAdMobAdapterStatuses()),
  };
}

export type AdInspectorResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Opens AdMob's Ad Inspector overlay, which shows the live mediation waterfall
 * for each ad request — the authoritative answer to "is Unity Ads actually in
 * this ad unit's waterfall?".
 *
 * Only opens on a test device. Emulators and simulators are registered as test
 * devices automatically by the Google Mobile Ads SDK, so no configuration is
 * needed there. A physical device must be listed in
 * `RequestConfiguration.testDeviceIdentifiers`, which this app populates from
 * EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS; Google logs the required ID on the first
 * ad request.
 */
export async function openAdMobInspector(): Promise<AdInspectorResult> {
  if (!__DEV__) return { ok: false, reason: 'Disabled outside development builds.' };

  const provider = getConfiguredMobileAdProvider();
  if (provider !== 'admob') {
    return { ok: false, reason: `Ad provider is "${provider}" — switch to admob to inspect it.` };
  }
  if (!isAdMobAvailable()) {
    return {
      ok: false,
      reason: 'AdMob native module unavailable. Use a development build, not Expo Go.',
    };
  }
  if (!isAdMobInitialized()) {
    return { ok: false, reason: 'AdMob SDK not initialized yet. Wait for bootstrap, then retry.' };
  }

  const mod = getGoogleMobileAdsModule('ad inspector');
  if (!mod) return { ok: false, reason: 'Could not load react-native-google-mobile-ads.' };

  try {
    await mod.default().openAdInspector();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return {
      ok: false,
      reason:
        envConfig.admob.testDeviceIds.length === 0
          ? `${message} — on a physical device this usually means it is not a registered ` +
            'test device; add its ID to EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS. Emulators register automatically.'
          : message,
    };
  }
}

export type LoadProbeResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };

/**
 * Requests (but never shows) one rewarded ad.
 *
 * Its purpose is to make Google emit the device-registration log line:
 *   "Use RequestConfiguration.Builder.setTestDeviceIds(Arrays.asList("<ID>"))"
 * which is the only way to obtain the ID needed by the Ad Inspector.
 *
 * No reward can be granted here: nothing is shown, so EARNED_REWARD never fires.
 */
export async function loadRewardedAdProbe(): Promise<LoadProbeResult> {
  if (!__DEV__) return { ok: false, reason: 'Disabled outside development builds.' };

  if (!isAdMobInitialized()) {
    return { ok: false, reason: 'AdMob SDK not initialized yet.' };
  }

  const resolved = resolveRewardedUnitId();
  if (!resolved) return { ok: false, reason: 'No rewarded unit resolved.' };

  try {
    const loaded = await getAdProvider().loadRewardedAd(resolved.unitId);
    return {
      ok: true,
      message: loaded
        ? 'Ad loaded. Check logcat for the test device ID.'
        : 'Load failed — but the request still logs the device ID. Check logcat.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, reason: message };
  }
}
