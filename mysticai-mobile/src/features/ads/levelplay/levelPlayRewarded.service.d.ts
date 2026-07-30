// Type-only resolution shim for the extensionless `./levelPlayRewarded.service`
// import — see levelPlay.service.d.ts for why this file exists.
import type { AdResult } from '../../monetization/providers/AdProviderAdapter';

export type LevelPlayRewardedState =
  | 'idle'
  | 'initializing'
  | 'loading'
  | 'ready'
  | 'showing'
  | 'rewarded'
  | 'closed'
  | 'failed';

export type LevelPlayRewardedSnapshot = {
  state: LevelPlayRewardedState;
  error: Error | null;
  isInitializing: boolean;
  isLoading: boolean;
  isShowing: boolean;
  ready: boolean;
};

declare class LevelPlayRewardedServiceApi {
  subscribe(subscriber: (snapshot: LevelPlayRewardedSnapshot) => void): () => void;
  getSnapshot(): LevelPlayRewardedSnapshot;
  markInitializing(): void;
  ensureInstance(): boolean;
  load(): Promise<boolean>;
  isReady(): Promise<boolean>;
  prepareRewardSession(rewardSessionId: string): Promise<void>;
  show(placementName?: string): Promise<AdResult>;
  dispose(): Promise<void>;
  destroy(): void;
}

export declare const levelPlayRewardedService: LevelPlayRewardedServiceApi;
