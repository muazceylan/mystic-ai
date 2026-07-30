import type { AdProviderAdapter, AdResult } from './AdProviderAdapter';
import type { RewardedAdProvider } from './RewardedAdProvider';
import type {
  AdsInitializationOptions,
  MobileAdProviderCapabilities,
} from './mobileAds.types';
import { createNativeRewardSession } from '../api/monetization.service';
import { initializeLevelPlay } from '../../ads/levelplay/levelPlay.service';
import { levelPlayRewardedService } from '../../ads/levelplay/levelPlayRewarded.service';

export class LevelPlayRewardedProvider
  implements AdProviderAdapter, RewardedAdProvider
{
  readonly name = 'levelplay' as const;
  readonly capabilities: MobileAdProviderCapabilities = {
    supportsRewardedAds: true,
    requiresTrackingAuthorization: true,
    supportsNonPersonalizedAds: true,
    supportsServerSideVerification: true,
  };

  private userId: string | number | null = null;

  async initialize(
    options: AdsInitializationOptions,
    userId?: string | number | null,
  ): Promise<void> {
    this.userId = userId ?? null;
    const initialized = await initializeLevelPlay(options, this.userId);
    if (!initialized) throw new Error('LevelPlay initialization failed.');
    levelPlayRewardedService.ensureInstance();
  }

  load(_adUnitId?: string): Promise<boolean> {
    return levelPlayRewardedService.load();
  }

  loadRewardedAd(adUnitId: string): Promise<boolean> {
    return this.load(adUnitId);
  }

  isReady(): boolean {
    return levelPlayRewardedService.getSnapshot().ready;
  }

  isLoaded(): boolean {
    return this.isReady();
  }

  async show(placementName = 'TOKEN_WALLET'): Promise<AdResult> {
    if (!this.userId) {
      return { completed: false, error: 'Authenticated user required' };
    }

    try {
      const session = await createNativeRewardSession({
        provider: 'LEVELPLAY',
        channel: 'MOBILE',
        placement: placementName,
      });
      await levelPlayRewardedService.prepareRewardSession(String(session.rewardSessionId));
      return await levelPlayRewardedService.show(placementName);
    } catch (error) {
      return {
        completed: false,
        error: error instanceof Error ? error.message : 'reward_session_failed',
      };
    }
  }

  showRewardedAd(): Promise<AdResult> {
    return this.show();
  }

  dispose(): Promise<void> {
    return levelPlayRewardedService.dispose();
  }
}
