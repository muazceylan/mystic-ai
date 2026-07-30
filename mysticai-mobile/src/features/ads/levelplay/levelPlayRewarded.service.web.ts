import type { AdResult } from '../../monetization/providers/AdProviderAdapter';

// Web build never imports the native LevelPlay mediation SDK (see
// levelPlay.service.web.ts). This stub mirrors `LevelPlayRewardedService` from
// levelPlayRewarded.service.native.ts so callers work unmodified across
// platforms; every operation is a controlled no-op.
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

type Subscriber = (snapshot: LevelPlayRewardedSnapshot) => void;

class LevelPlayRewardedService {
  private getSnapshotValue(): LevelPlayRewardedSnapshot {
    return {
      state: 'idle',
      error: null,
      isInitializing: false,
      isLoading: false,
      isShowing: false,
      ready: false,
    };
  }

  subscribe(subscriber: Subscriber): () => void {
    subscriber(this.getSnapshotValue());
    return () => undefined;
  }

  getSnapshot(): LevelPlayRewardedSnapshot {
    return this.getSnapshotValue();
  }

  markInitializing(): void {
    // no-op: LevelPlay is unsupported on web
  }

  ensureInstance(): boolean {
    return false;
  }

  load(): Promise<boolean> {
    return Promise.resolve(false);
  }

  async isReady(): Promise<boolean> {
    return false;
  }

  async prepareRewardSession(_rewardSessionId: string): Promise<void> {
    // no-op: no ad session exists to attach server params to on web
  }

  show(_placementName?: string): Promise<AdResult> {
    return Promise.resolve({ completed: false, error: 'PROVIDER_NOT_SUPPORTED' });
  }

  async dispose(): Promise<void> {
    // no-op
  }

  destroy(): void {
    // no-op
  }
}

export const levelPlayRewardedService = new LevelPlayRewardedService();
