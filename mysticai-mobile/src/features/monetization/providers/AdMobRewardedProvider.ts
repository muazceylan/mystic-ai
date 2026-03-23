import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import type { AdProviderAdapter, AdResult } from './AdProviderAdapter';
import { initializeAdMob, isAdMobInitialized, isAdMobAvailable } from './admobInit';
import { resolveRewardedUnitId, maskUnitId } from './admobUnitIds';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';

const AD_LOAD_TIMEOUT_MS = 15_000;

/**
 * Production AdMob rewarded ad provider.
 * Implements the AdProviderAdapter interface for seamless integration
 * with the existing monetization foundation.
 */
export class AdMobRewardedProvider implements AdProviderAdapter {
  private rewardedAd: RewardedAd | null = null;
  private loaded = false;
  private showing = false;

  async initialize(): Promise<void> {
    await initializeAdMob();
  }

  async loadRewardedAd(adUnitId: string): Promise<boolean> {
    // Prevent loading while another ad is being shown
    if (this.showing) {
      if (__DEV__) console.warn('[AdMob] Cannot load while ad is being shown');
      return false;
    }

    if (!isAdMobInitialized()) {
      const initOk = await initializeAdMob();
      if (!initOk) {
        trackMonetizationEvent('rewarded_ad_load_failed', {
          reason: 'sdk_not_initialized',
          platform: Platform.OS,
        });
        return false;
      }
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
      const timeoutId = setTimeout(() => {
        if (__DEV__) console.warn('[AdMob] Rewarded ad load timed out');
        trackMonetizationEvent('rewarded_ad_load_failed', {
          reason: 'timeout',
          ad_provider: 'admob',
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
        });
        this.cleanup();
        resolve(false);
      }, AD_LOAD_TIMEOUT_MS);

      try {
        const ad = RewardedAd.createForAdRequest(unitId);

        const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          clearTimeout(timeoutId);
          this.loaded = true;
          this.rewardedAd = ad;

          trackMonetizationEvent('rewarded_ad_loaded', {
            ad_provider: 'admob',
            ad_unit_mode: resolved.mode,
            platform: Platform.OS,
          });

          if (__DEV__) console.log('[AdMob] Rewarded ad loaded');
          unsubLoaded();
          resolve(true);
        });

        const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
          clearTimeout(timeoutId);
          const reason = error?.message ?? 'unknown_load_error';

          trackMonetizationEvent('rewarded_ad_load_failed', {
            reason,
            ad_provider: 'admob',
            ad_unit_mode: resolved.mode,
            platform: Platform.OS,
          });

          if (__DEV__) console.warn('[AdMob] Rewarded ad load error:', reason);
          unsubLoaded();
          unsubError();
          this.cleanup();
          resolve(false);
        });

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
      let rewarded = false;
      let rewardType = '';
      let rewardAmount = 0;

      const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          rewarded = true;
          rewardType = reward.type ?? 'guru';
          rewardAmount = reward.amount ?? 1;

          if (__DEV__) {
            console.log('[AdMob] Reward earned:', { type: rewardType, amount: rewardAmount });
          }
        },
      );

      const unsubOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        trackMonetizationEvent('rewarded_ad_opened', {
          ad_provider: 'admob',
          ad_unit_mode: resolved?.mode ?? 'unknown',
          platform: Platform.OS,
        });
      });

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
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

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
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

      try {
        ad.show();
      } catch (error) {
        unsubAll();
        this.showing = false;
        this.loaded = false;
        this.rewardedAd = null;
        const reason = error instanceof Error ? error.message : 'show_failed';
        resolve({ completed: false, error: reason });
      }
    });
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
