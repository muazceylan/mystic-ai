// Type-only resolution shim for the extensionless `./LevelPlayRewardedProvider`
// import — see levelPlay.service.d.ts for why this file exists.
import type { AdProviderAdapter, AdResult } from './AdProviderAdapter';
import type { RewardedAdProvider } from './RewardedAdProvider';
import type {
  AdsInitializationOptions,
  MobileAdProviderCapabilities,
} from './mobileAds.types';

export declare class LevelPlayRewardedProvider
  implements AdProviderAdapter, RewardedAdProvider
{
  readonly name: 'levelplay';
  readonly capabilities: MobileAdProviderCapabilities;
  initialize(options: AdsInitializationOptions, userId?: string | number | null): Promise<void>;
  load(adUnitId?: string): Promise<boolean>;
  loadRewardedAd(adUnitId: string): Promise<boolean>;
  isReady(): boolean;
  isLoaded(): boolean;
  show(placementName?: string): Promise<AdResult>;
  showRewardedAd(): Promise<AdResult>;
  dispose(): Promise<void>;
}
