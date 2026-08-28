import { Platform } from 'react-native';
import type { AdProviderAdapter, AdResult } from './AdProviderAdapter';
import { initializeAdMob, isAdMobInitialized } from './admobInit';
import { resolveRewardedUnitId, maskUnitId } from './admobUnitIds';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { getGoogleMobileAdsModule } from './googleMobileAdsRuntime';
import type { RewardedAdLike } from './googleMobileAdsRuntime.shared';
import type {
  AdsInitializationOptions,
  MobileAdProviderCapabilities,
} from './mobileAds.types';
import { getAdMobInitializationOptions } from './admobInit';
import type { RewardedAdProvider } from './RewardedAdProvider';

const AD_LOAD_TIMEOUT_MS = 15_000;

/**
 * Production AdMob rewarded ad provider.
 * Implements the AdProviderAdapter interface for seamless integration
 * with the existing monetization foundation.
 */
export class AdMobRewardedProvider implements AdProviderAdapter, RewardedAdProvider {
  readonly name = 'admob' as const;
  readonly capabilities: MobileAdProviderCapabilities = {
    supportsRewardedAds: true,
    requiresTrackingAuthorization: true,
    supportsNonPersonalizedAds: true,
    supportsServerSideVerification: false,
  };
  private rewardedAd: RewardedAdLike | null = null;
  private loaded = false;
  private showing = false;

  async initialize(options: AdsInitializationOptions): Promise<void> {
    await initializeAdMob(options, options.testDeviceIds);
  }

  async loadRewardedAd(adUnitId: string): Promise<boolean> {
    // Prevent loading while another ad is being shown
    if (this.showing) {
      if (__DEV__) console.warn('[AdMob] Cannot load while ad is being shown');
      return false;
    }

    if (!isAdMobInitialized()) {
      trackMonetizationEvent('rewarded_ad_load_failed', {
        reason: 'privacy_bootstrap_incomplete',
        platform: Platform.OS,
      });
      return false;
    }

    // Resolve the correct unit ID (test vs production)
    const resolved = resolveRewardedUnitId();
    if (!resolved) {
      trackMonetizationEvent('rewarded_ad_load_failed', {
        reason: 'no_unit_id',
        platform: Platform.OS,
      });
      return false;
    }

    // Use resolved unit ID instead of the passed-in one
    const unitId = resolved.unitId;

    if (__DEV__) {
      console.log(
        `[AdMob] Loading rewarded ad (mode=${resolved.mode}, unit=${maskUnitId(unitId, resolved.mode)})`,
      );
    }

    trackMonetizationEvent('rewarded_ad_load_started', {
      ad_provider: 'admob',
      ad_unit_mode: resolved.mode,
      platform: Platform.OS,
    });

    // Clean up any previous instance
    this.cleanup();

    return new Promise<boolean>((resolve) => {
      let detachOnTimeout: (() => void) | null = null;

      const timeoutId = setTimeout(() => {
        if (__DEV__) console.warn('[AdMob] Rewarded ad load timed out');
        trackMonetizationEvent('rewarded_ad_load_failed', {
          reason: 'timeout',
          ad_provider: 'admob',
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
        });
        detachOnTimeout?.();
        this.cleanup();
        resolve(false);
      }, AD_LOAD_TIMEOUT_MS);

      try {
        const googleMobileAds = getGoogleMobileAdsModule('rewarded ad load');
        if (!googleMobileAds) {
          clearTimeout(timeoutId);
          trackMonetizationEvent('rewarded_ad_load_failed', {
            reason: 'native_module_unavailable',
            ad_provider: 'admob',
            ad_unit_mode: resolved.mode,
            platform: Platform.OS,
          });
          resolve(false);
          return;
        }

        const initializationOptions = getAdMobInitializationOptions();
        const ad = googleMobileAds.RewardedAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly:
            !(initializationOptions?.personalizedAdvertisingAllowed ?? false),
        });

        // Both load listeners must be torn down once the load settles. Leaving
        // the error listener attached let a later show-time error run the load
        // handler too, which called cleanup() and dropped the ad instance out
        // from under the show flow.
        let unsubLoadListeners = () => {};

        const unsubLoaded = ad.addAdEventListener(googleMobileAds.RewardedAdEventType.LOADED, () => {
          clearTimeout(timeoutId);
          this.loaded = true;
          this.rewardedAd = ad;

          trackMonetizationEvent('rewarded_ad_loaded', {
            ad_provider: 'admob',
            ad_unit_mode: resolved.mode,
            platform: Platform.OS,
          });

          if (__DEV__) console.log('[AdMob] Rewarded ad loaded');
          unsubLoadListeners();
          resolve(true);
        });

        const unsubError = ad.addAdEventListener(googleMobileAds.AdEventType.ERROR, (error) => {
          clearTimeout(timeoutId);
          const reason = error?.message ?? 'unknown_load_error';

          trackMonetizationEvent('rewarded_ad_load_failed', {
            reason,
            ad_provider: 'admob',
            ad_unit_mode: resolved.mode,
            platform: Platform.OS,
          });

          if (__DEV__) console.warn('[AdMob] Rewarded ad load error:', reason);
          unsubLoadListeners();
          this.cleanup();
          resolve(false);
        });

        unsubLoadListeners = () => {
          unsubLoaded();
          unsubError();
        };
        detachOnTimeout = unsubLoadListeners;

        ad.load();
      } catch (error) {
        clearTimeout(timeoutId);
        const reason = error instanceof Error ? error.message : 'unexpected_error';
        trackMonetizationEvent('rewarded_ad_load_failed', {
          reason,
          ad_provider: 'admob',
          platform: Platform.OS,
        });
        this.cleanup();
        resolve(false);
      }
    });
  }

  load(adUnitId = ''): Promise<boolean> {
    return this.loadRewardedAd(adUnitId);
  }

  async showRewardedAd(): Promise<AdResult> {
    if (!this.loaded || !this.rewardedAd) {
      return { completed: false, error: 'Ad not loaded' };
    }

    if (this.showing) {
      return { completed: false, error: 'Ad already being shown' };
    }

    this.showing = true;
    const ad = this.rewardedAd;
    const resolved = resolveRewardedUnitId();

    trackMonetizationEvent('rewarded_ad_show_started', {
      ad_provider: 'admob',
      ad_unit_mode: resolved?.mode ?? 'unknown',
      platform: Platform.OS,
    });

    return new Promise<AdResult>((resolve) => {
      let settled = false;
      let rewarded = false;
      let rewardType = '';
      let rewardAmount = 0;

      const googleMobileAds = getGoogleMobileAdsModule('rewarded ad show');
      if (!googleMobileAds) {
        this.showing = false;
        this.loaded = false;
        this.rewardedAd = null;
        resolve({ completed: false, error: 'native_module_unavailable' });
        return;
      }

      const unsubEarned = ad.addAdEventListener(
        googleMobileAds.RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          rewarded = true;
          rewardType = reward?.type ?? 'guru';
          rewardAmount = reward?.amount ?? 1;

          if (__DEV__) {
            console.log('[AdMob] Reward earned:', { type: rewardType, amount: rewardAmount });
          }
        },
      );

      const unsubOpened = ad.addAdEventListener(googleMobileAds.AdEventType.OPENED, () => {
        trackMonetizationEvent('rewarded_ad_opened', {
          ad_provider: 'admob',
          ad_unit_mode: resolved?.mode ?? 'unknown',
          platform: Platform.OS,
        });
      });

      const unsubClosed = ad.addAdEventListener(googleMobileAds.AdEventType.CLOSED, () => {
        if (settled) return;
        settled = true;
        unsubAll();
        this.showing = false;
        this.loaded = false;
        this.rewardedAd = null;

        if (rewarded) {
          resolve({
            completed: true,
            rewardType,
            rewardAmount,
          });
        } else {
          trackMonetizationEvent('rewarded_ad_dismissed', {
            ad_provider: 'admob',
            ad_unit_mode: resolved?.mode ?? 'unknown',
            reason: 'user_dismissed',
            platform: Platform.OS,
          });
          resolve({ completed: false, error: 'user_dismissed' });
        }
      });

      const unsubError = ad.addAdEventListener(googleMobileAds.AdEventType.ERROR, (error) => {
        if (settled) return;
        settled = true;
        unsubAll();
        this.showing = false;
        this.loaded = false;
        this.rewardedAd = null;

        const reason = error?.message ?? 'unknown_show_error';
        resolve({ completed: false, error: reason });
      });

      const unsubAll = () => {
        unsubEarned();
        unsubOpened();
        unsubClosed();
        unsubError();
      };

      const failShow = (error: unknown) => {
        // show() can reject after the ad already closed cleanly; don't report
        // that as a failure.
        if (settled) return;
        settled = true;
        unsubAll();
        this.showing = false;
        this.loaded = false;
        this.rewardedAd = null;
        const reason = error instanceof Error ? error.message : 'show_failed';

        trackMonetizationEvent('rewarded_ad_failed', {
          reason,
          ad_provider: 'admob',
          ad_unit_mode: resolved?.mode ?? 'unknown',
          platform: Platform.OS,
        });

        if (__DEV__) console.warn('[AdMob] Rewarded ad show error:', reason);
        resolve({ completed: false, error: reason });
      };

      try {
        // show() is async on the native side. Without catching its rejection the
        // promise below never settled — the UI sat on its spinner and no ad ever
        // appeared — and the rejection surfaced as an unhandled one.
        const shown = ad.show() as unknown;
        if (shown && typeof (shown as Promise<void>).then === 'function') {
          (shown as Promise<void>).catch(failShow);
        }
      } catch (error) {
        failShow(error);
      }
    });
  }

  show(_placementName?: string): Promise<AdResult> {
    return this.showRewardedAd();
  }

  isReady(): boolean {
    return this.isLoaded();
  }

  dispose(): void {
    this.cleanup();
    this.showing = false;
  }

  isLoaded(): boolean {
    return this.loaded && this.rewardedAd !== null;
  }

  /**
   * Clean up current ad instance to prevent stale references.
   */
  private cleanup(): void {
    this.rewardedAd = null;
    this.loaded = false;
  }
}
