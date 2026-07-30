import type { AdsInitializationOptions } from './mobileAds.types';
import type { AdResult } from './AdProviderAdapter';

export interface RewardedAdProvider {
  initialize(options: AdsInitializationOptions, userId?: string | number | null): Promise<void>;
  load(adUnitId?: string): Promise<boolean>;
  isReady(): boolean;
  show(placementName?: string): Promise<AdResult>;
  dispose(): Promise<void> | void;
}
