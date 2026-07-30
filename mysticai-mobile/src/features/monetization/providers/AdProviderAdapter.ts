/**
 * Provider-agnostic ad adapter.
 * Currently uses a stub implementation for development.
 * Swap to real AdMob by replacing the singleton below.
 */

import type {
  AdsInitializationOptions,
  MobileAdProviderCapabilities,
  MobileAdProviderName,
} from './mobileAds.types';

export interface AdProviderAdapter {
  readonly name: MobileAdProviderName;
  readonly capabilities: MobileAdProviderCapabilities;
  initialize(options: AdsInitializationOptions): Promise<void>;
  loadRewardedAd(adUnitId: string): Promise<boolean>;
  showRewardedAd(): Promise<AdResult>;
  isLoaded(): boolean;
  dispose?(): Promise<void> | void;
}

export interface AdResult {
  completed: boolean;
  rewardType?: string;
  rewardAmount?: number;
  transactionId?: string;
  error?: string;
}

/**
 * Stub implementation for development — always succeeds after simulated delays.
 * Replace with AdMobProvider when integrating the real SDK.
 */
class StubAdProvider implements AdProviderAdapter {
  readonly name = 'none' as const;
  readonly capabilities: MobileAdProviderCapabilities = {
    supportsRewardedAds: false,
    requiresTrackingAuthorization: false,
    supportsNonPersonalizedAds: true,
    supportsServerSideVerification: false,
  };
  private loaded = false;

  async initialize(_options: AdsInitializationOptions): Promise<void> {
    // No-op for stub
  }

  async loadRewardedAd(_adUnitId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.loaded = true;
    return true;
  }

  async showRewardedAd(): Promise<AdResult> {
    if (!this.loaded) {
      return { completed: false, error: 'Ad not loaded' };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.loaded = false;
    return { completed: true, rewardType: 'guru', rewardAmount: 1 };
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  dispose(): void {
    this.loaded = false;
  }
}

// Singleton instance — swap implementation here when integrating real AdMob
let adProvider: AdProviderAdapter = new StubAdProvider();

export function getAdProvider(): AdProviderAdapter {
  return adProvider;
}

export function setAdProvider(provider: AdProviderAdapter): void {
  adProvider = provider;
}
