import { AppState, type AppStateStatus } from 'react-native';
import {
  LevelPlay,
  LevelPlayRewardedAd,
  type LevelPlayAdError,
  type LevelPlayAdInfo,
  type LevelPlayReward,
  type LevelPlayRewardedAdListener,
} from 'unity-levelplay-mediation';
import type { AdResult } from '../../monetization/providers/AdProviderAdapter';
import {
  LEVELPLAY_REWARDED_SERVER_PARAMS_KEY,
  getLevelPlayConfig,
} from './levelPlay.config';
import { isLevelPlayInitialized } from './levelPlay.service';

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

const LOAD_TIMEOUT_MS = 20_000;
const DISPLAY_TIMEOUT_MS = 120_000;
const REWARD_AFTER_CLOSE_GRACE_MS = 1_500;

type Subscriber = (snapshot: LevelPlayRewardedSnapshot) => void;

class LevelPlayRewardedService {
  private ad: LevelPlayRewardedAd | null = null;
  private state: LevelPlayRewardedState = 'idle';
  private error: Error | null = null;
  private ready = false;
  private loadPromise: Promise<boolean> | null = null;
  private showPromise: Promise<AdResult> | null = null;
  private subscribers = new Set<Subscriber>();
  private loadResolve: ((loaded: boolean) => void) | null = null;
  private showResolve: ((result: AdResult) => void) | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private closeGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private rewardedResult: AdResult | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private appStateSubscription = AppState.addEventListener('change', (next) => {
    const returnedToForeground = this.appState === 'background' && next === 'active';
    this.appState = next;
    if (returnedToForeground && isLevelPlayInitialized() && !this.ready && !this.showPromise) {
      void this.load();
    }
  });

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.getSnapshot());
    return () => this.subscribers.delete(subscriber);
  }

  getSnapshot(): LevelPlayRewardedSnapshot {
    return {
      state: this.state,
      error: this.error,
      isInitializing: this.state === 'initializing',
      isLoading: this.state === 'loading',
      isShowing: this.state === 'showing',
      ready: this.ready,
    };
  }

  markInitializing(): void {
    this.update('initializing');
  }

  ensureInstance(): boolean {
    if (this.ad) return true;
    if (!isLevelPlayInitialized()) {
      this.fail(new Error('LevelPlay must initialize before creating a rewarded ad.'));
      return false;
    }
    const config = getLevelPlayConfig();
    if (!config.rewardedAdUnitId) {
      this.fail(new Error('LevelPlay rewarded ad unit is not configured.'));
      return false;
    }

    this.ad = new LevelPlayRewardedAd(config.rewardedAdUnitId);
    this.ad.setListener(this.listener);
    return true;
  }

  load(): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    if (this.loadPromise) return this.loadPromise;
    if (this.showPromise || !this.ensureInstance() || !this.ad) return Promise.resolve(false);

    this.update('loading');
    this.loadPromise = new Promise<boolean>((resolve) => {
      this.loadResolve = resolve;
      this.loadTimer = setTimeout(() => {
        this.loadTimer = null;
        this.finishLoad(false, new Error('LevelPlay rewarded load timed out.'));
      }, LOAD_TIMEOUT_MS);

      void this.ad?.loadAd().catch((loadError) => {
        this.finishLoad(false, this.toError(loadError, 'LevelPlay rewarded load failed.'));
      });
    }).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  async isReady(): Promise<boolean> {
    if (!this.ready || !this.ad) return false;
    try {
      this.ready = await this.ad.isAdReady();
      return this.ready;
    } catch {
      this.ready = false;
      return false;
    }
  }

  async prepareRewardSession(rewardSessionId: string): Promise<void> {
    // Session ID is delivered as a custom S2S parameter. Do not place emails,
    // names, token amounts, or other sensitive/user-controlled values here.
    await LevelPlay.setMetaData(LEVELPLAY_REWARDED_SERVER_PARAMS_KEY, [
      `rewardSessionId=${rewardSessionId}`,
    ]);
  }

  show(placementName?: string): Promise<AdResult> {
    if (this.showPromise) return this.showPromise;
    if (!this.ad || !this.ready) {
      return Promise.resolve({ completed: false, error: 'Ad not ready' });
    }

    this.ready = false;
    this.rewardedResult = null;
    this.update('showing');
    this.showPromise = new Promise<AdResult>((resolve) => {
      this.showResolve = resolve;
      this.displayTimer = setTimeout(() => {
        this.displayTimer = null;
        this.finishShow({ completed: false, error: 'LevelPlay display timed out' });
      }, DISPLAY_TIMEOUT_MS);

      void this.ad?.showAd(placementName).catch((showError) => {
        this.finishShow({
          completed: false,
          error: this.toError(showError, 'LevelPlay display failed.').message,
        });
      });
    }).finally(() => {
      this.showPromise = null;
      void this.load();
    });
    return this.showPromise;
  }

  async dispose(): Promise<void> {
    this.clearTimers();
    this.loadResolve?.(false);
    this.showResolve?.({ completed: false, error: 'Provider disposed' });
    this.loadResolve = null;
    this.showResolve = null;
    this.loadPromise = null;
    this.showPromise = null;
    this.ready = false;
    const ad = this.ad;
    this.ad = null;
    if (ad) {
      try {
        await ad.remove();
      } catch {
        // Native cleanup is best-effort during app teardown/provider switches.
      }
    }
    this.update('idle', null);
  }

  destroy(): void {
    this.appStateSubscription.remove();
    void this.dispose();
    this.subscribers.clear();
  }

  private listener: LevelPlayRewardedAdListener = {
    onAdLoaded: (_adInfo: LevelPlayAdInfo) => {
      this.ready = true;
      this.finishLoad(true);
    },
    onAdLoadFailed: (adError: LevelPlayAdError) => {
      this.finishLoad(false, this.toError(adError, 'LevelPlay rewarded load failed.'));
    },
    onAdDisplayed: (_adInfo: LevelPlayAdInfo) => {
      this.update('showing');
    },
    onAdDisplayFailed: (adError: LevelPlayAdError, _adInfo: LevelPlayAdInfo) => {
      this.finishShow({
        completed: false,
        error: this.toError(adError, 'LevelPlay display failed.').message,
      });
    },
    onAdClicked: (_adInfo: LevelPlayAdInfo) => undefined,
    onAdClosed: (_adInfo: LevelPlayAdInfo) => {
      this.update('closed');
      if (this.rewardedResult) {
        this.finishShow(this.rewardedResult);
        return;
      }
      // Unity explicitly does not guarantee reward/close callback order.
      this.closeGraceTimer = setTimeout(() => {
        this.closeGraceTimer = null;
        this.finishShow({ completed: false, error: 'user_dismissed' });
      }, REWARD_AFTER_CLOSE_GRACE_MS);
    },
    onAdRewarded: (reward: LevelPlayReward, adInfo: LevelPlayAdInfo) => {
      this.rewardedResult = {
        completed: true,
        rewardType: reward.name || 'guru',
        rewardAmount: reward.amount,
        transactionId: adInfo.adId || undefined,
      };
      this.update('rewarded');
      // Resolve independently of close; the backend S2S event remains the only
      // authority that credits the wallet.
      this.finishShow(this.rewardedResult);
    },
    onAdInfoChanged: (_adInfo: LevelPlayAdInfo) => undefined,
  };

  private finishLoad(loaded: boolean, loadError: Error | null = null): void {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.loadTimer = null;
    this.ready = loaded;
    this.update(loaded ? 'ready' : 'failed', loadError);
    const resolve = this.loadResolve;
    this.loadResolve = null;
    resolve?.(loaded);
  }

  private finishShow(result: AdResult): void {
    if (!this.showResolve) return;
    if (this.displayTimer) clearTimeout(this.displayTimer);
    if (this.closeGraceTimer) clearTimeout(this.closeGraceTimer);
    this.displayTimer = null;
    this.closeGraceTimer = null;
    const resolve = this.showResolve;
    this.showResolve = null;
    resolve(result);
  }

  private fail(nextError: Error): void {
    this.update('failed', nextError);
  }

  private update(nextState: LevelPlayRewardedState, nextError: Error | null = null): void {
    this.state = nextState;
    this.error = nextError;
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((subscriber) => subscriber(snapshot));
  }

  private clearTimers(): void {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    if (this.displayTimer) clearTimeout(this.displayTimer);
    if (this.closeGraceTimer) clearTimeout(this.closeGraceTimer);
    this.loadTimer = null;
    this.displayTimer = null;
    this.closeGraceTimer = null;
  }

  private toError(value: unknown, fallback: string): Error {
    if (value instanceof Error) return value;
    if (value && typeof value === 'object' && 'errorMessage' in value) {
      return new Error(String((value as { errorMessage: unknown }).errorMessage));
    }
    return new Error(fallback);
  }
}

export const levelPlayRewardedService = new LevelPlayRewardedService();
