import type { AdProviderAdapter, AdResult } from './AdProviderAdapter';
import type { RewardedAdProvider } from './RewardedAdProvider';
import type {
  AdsInitializationOptions,
  MobileAdProviderCapabilities,
} from './mobileAds.types';

// Web build never imports the native LevelPlay mediation SDK — it is
// native-only (see levelPlay.service.web.ts). This stub keeps the same public
// contract as LevelPlayRewardedProvider.native.ts so `initProvider.ts` and any
// other caller can use it unmodified; every operation is a controlled no-op
// that never grants a reward or reports an ad as completed.
export class LevelPlayRewardedProvider
  implements AdProviderAdapter, RewardedAdProvider
{
  readonly name = 'levelplay' as const;
  readonly capabilities: MobileAdProviderCapabilities = {
    supportsRewardedAds: false,
    requiresTrackingAuthorization: false,
    supportsNonPersonalizedAds: true,
    supportsServerSideVerification: false,
  };

  async initialize(
    _options: AdsInitializationOptions,
    _userId?: string | number | null,
  ): Promise<void> {
    // no-op: LevelPlay is unsupported on web
  }

  load(_adUnitId?: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  loadRewardedAd(adUnitId: string): Promise<boolean> {
    return this.load(adUnitId);
  }

  isReady(): boolean {
    return false;
  }

  isLoaded(): boolean {
    return this.isReady();
  }

  async show(_placementName?: string): Promise<AdResult> {
    return { completed: false, error: 'PROVIDER_NOT_SUPPORTED' };
  }

  showRewardedAd(): Promise<AdResult> {
    return this.show();
  }

  async dispose(): Promise<void> {
    // no-op
  }
}
