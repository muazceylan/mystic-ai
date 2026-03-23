/**
 * Provider-agnostic ad adapter.
 * Currently uses a stub implementation for development.
 * Swap to real AdMob by replacing the singleton below.
 */

export interface AdProviderAdapter {
  initialize(): Promise<void>;
  loadRewardedAd(adUnitId: string): Promise<boolean>;
  showRewardedAd(): Promise<AdResult>;
  isLoaded(): boolean;
}

export interface AdResult {
  completed: boolean;
  rewardType?: string;
  rewardAmount?: number;
  error?: string;
}

/**
 * Stub implementation for development — always succeeds after simulated delays.
 * Replace with AdMobProvider when integrating the real SDK.
 */
class StubAdProvider implements AdProviderAdapter {
  private loaded = false;

  async initialize(): Promise<void> {
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
}

// Singleton instance — swap implementation here when integrating real AdMob
let adProvider: AdProviderAdapter = new StubAdProvider();

export function getAdProvider(): AdProviderAdapter {
  return adProvider;
}

export function setAdProvider(provider: AdProviderAdapter): void {
  adProvider = provider;
}
