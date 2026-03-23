import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import { envConfig } from '../../../config/env';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';

export type AdUnitMode = 'test' | 'production';

interface ResolvedAdUnit {
  unitId: string;
  mode: AdUnitMode;
}

/**
 * Resolves the correct rewarded ad unit ID based on environment config.
 *
 * CRITICAL production safety rule:
 * - useTestIds=true (or __DEV__)  → Google test rewarded unit
 * - useTestIds=false (prod build) → platform-specific env unit
 * - If prod unit is MISSING       → returns null (NO test fallback!)
 *
 * Callers MUST check for null and refuse to request ads.
 */
export function resolveRewardedUnitId(): ResolvedAdUnit | null {
  // Dev / internal test build → safe to use Google test units
  if (envConfig.admob.useTestIds) {
    return { unitId: TestIds.REWARDED, mode: 'test' };
  }

  // Production build → ONLY use real env-provided unit IDs
  const unitId = Platform.select({
    ios: envConfig.admob.iosRewardedUnitId,
    android: envConfig.admob.androidRewardedUnitId,
  });

  if (!unitId) {
    // NEVER fall back to test units in production
    console.error(
      `[AdMob] MISSING production rewarded unit ID for ${Platform.OS}. ` +
      'Ads will not be served. Set EXPO_PUBLIC_ADMOB_*_REWARDED_UNIT_ID in env.',
    );
    trackMonetizationEvent('ineligible_reason', {
      reason: 'missing_ad_unit_id',
      platform: Platform.OS,
      ad_provider: 'admob',
    });
    return null;
  }

  return { unitId, mode: 'production' };
}

/**
 * Returns a safe, masked version of an ad unit ID for logging.
 * In production mode, shows only the prefix to prevent leaking full IDs.
 * Test IDs are shown in full since they are public.
 */
export function maskUnitId(unitId: string, mode: AdUnitMode): string {
  if (mode === 'test') return unitId;
  if (unitId.length <= 16) return '***';
  // Show "ca-app-pub-XXXX…" prefix only
  const slashIdx = unitId.lastIndexOf('/');
  if (slashIdx > 0) {
    return `${unitId.slice(0, slashIdx + 1)}***`;
  }
  return `${unitId.slice(0, 16)}…`;
}

/**
 * Pre-flight check: can we serve ads in the current environment?
 * Returns a reason string if ads cannot be served, or null if OK.
 *
 * This is a cheap, synchronous check that doesn't touch the network.
 * Use before attempting to show ad UI or load ads.
 */
export function getAdBlockReason(
  opts: {
    configLoaded: boolean;
    adsEnabledGlobal: boolean;
    adsEnabledForModule: boolean;
    sdkInitialized: boolean;
  },
): string | null {
  if (!opts.configLoaded) return 'config_not_loaded';
  if (!opts.adsEnabledGlobal) return 'ads_disabled_globally';
  if (!opts.adsEnabledForModule) return 'ads_disabled_for_module';

  const resolved = resolveRewardedUnitId();
  if (!resolved) return 'missing_ad_unit_id';

  if (!opts.sdkInitialized) return 'admob_not_initialized';

  return null;
}
