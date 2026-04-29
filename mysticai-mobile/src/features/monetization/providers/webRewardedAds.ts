import { envConfig } from '../../../config/env';
import { emitRewardedEvent } from './webRewardedEvents';
import { getGoogletag, loadGPT, withGPT } from './gpt';

interface ActiveSession {
  slot: Slot;
  makeVisible?: () => void;
  adSessionId: string;
  listeners: Array<() => void>;
}

let activeSession: ActiveSession | null = null;

const PLACEHOLDER_AD_UNIT_PATHS = new Set([
  '/',
  '/12345/mysticai/rewarded_earn',
  '/1234567/example',
]);

function normalizeAdUnitPath(adUnitPath: string | null | undefined): string {
  return (adUnitPath ?? '').trim();
}

export function isPlaceholderWebRewardedAdUnitPath(adUnitPath: string | null | undefined): boolean {
  const normalized = normalizeAdUnitPath(adUnitPath);
  return !normalized || PLACEHOLDER_AD_UNIT_PATHS.has(normalized);
}

export function resolveWebRewardedAdUnitPath(
  intentAdUnitPath: string | null | undefined,
): string | null {
  const backendAdUnitPath = normalizeAdUnitPath(intentAdUnitPath);
  const envAdUnitPath = normalizeAdUnitPath(envConfig.webRewarded.adUnitPath);

  if (backendAdUnitPath && !isPlaceholderWebRewardedAdUnitPath(backendAdUnitPath)) {
    return backendAdUnitPath;
  }

  if (envAdUnitPath) {
    return envAdUnitPath;
  }

  return null;
}

export async function requestWebRewardedAd(
  adUnitPath: string,
  adSessionId: string,
): Promise<'ready' | 'unsupported' | 'error'> {
  if (isPlaceholderWebRewardedAdUnitPath(adUnitPath)) {
    emitRewardedEvent({
      type: 'SLOT_ERROR',
      error: 'Rewarded ad unit path is missing or still using the placeholder value.',
    });
    return 'error';
  }

  if (activeSession !== null) {
    destroyWebRewardedSlot();
  }

  try {
    await loadGPT();
  } catch {
    emitRewardedEvent({ type: 'SLOT_ERROR', error: 'GPT script could not be loaded.' });
    return 'error';
  }

  return new Promise<'ready' | 'unsupported' | 'error'>((resolve) => {
    withGPT(() => {
      const gt = getGoogletag();
      if (!gt) {
        emitRewardedEvent({ type: 'SLOT_ERROR', error: 'googletag not available.' });
        resolve('unsupported');
        return;
      }

      console.info('[WebRewardedAds] Requesting GPT rewarded slot.', {
        adUnitPath,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
      });

      const slot = gt.defineOutOfPageSlot(adUnitPath, gt.enums.OutOfPageFormat.REWARDED);
      if (!slot) {
        emitRewardedEvent({ type: 'SLOT_ERROR', error: 'Rewarded format not supported.' });
        resolve('unsupported');
        return;
      }

      slot.addService(gt.pubads());
      const sessionListeners: Array<() => void> = [];

      const onReady = (event: RewardedSlotReadyEvent): void => {
        if (event.slot !== slot) return;
        if (activeSession) {
          activeSession.makeVisible = event.makeRewardedVisible;
        }
        emitRewardedEvent({
          type: 'SLOT_READY',
          adSessionId,
          makeRewardedVisible: event.makeRewardedVisible,
        });
        resolve('ready');
      };

      const onGranted = (event: RewardedSlotGrantedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({
          type: 'SLOT_GRANTED',
          adSessionId,
          grantedPayload: event.payload,
        });
      };

      const onClosed = (event: RewardedSlotClosedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({ type: 'SLOT_CLOSED', adSessionId });
        destroyWebRewardedSlot();
      };

      const onVideoCompleted = (event: RewardedSlotVideoCompletedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({ type: 'SLOT_VIDEO_COMPLETED', adSessionId });
      };

      const onRenderEnded = (event: SlotRenderEndedEvent): void => {
        if (event.slot !== slot) return;
        if (event.isEmpty) {
          emitRewardedEvent({ type: 'SLOT_NO_FILL', adSessionId });
          destroyWebRewardedSlot();
          resolve('error');
        }
      };

      gt.pubads().addEventListener('rewardedSlotReady', onReady);
      gt.pubads().addEventListener('rewardedSlotGranted', onGranted);
      gt.pubads().addEventListener('rewardedSlotClosed', onClosed);
      gt.pubads().addEventListener('rewardedSlotVideoCompleted', onVideoCompleted);
      gt.pubads().addEventListener('slotRenderEnded', onRenderEnded);

      activeSession = {
        slot,
        adSessionId,
        listeners: sessionListeners,
      };

      gt.enableServices();
      try {
        gt.display(slot);
      } catch (error) {
        emitRewardedEvent({
          type: 'SLOT_ERROR',
          error: error instanceof Error ? error.message : 'GPT display failed.',
        });
        destroyWebRewardedSlot();
        resolve('error');
        return;
      }

      const timeoutId = setTimeout(() => {
        if (activeSession?.adSessionId === adSessionId) {
          emitRewardedEvent({ type: 'SLOT_NO_FILL', adSessionId, error: 'Ad request timed out.' });
          destroyWebRewardedSlot();
          resolve('error');
        }
      }, 15_000);

      sessionListeners.push(() => clearTimeout(timeoutId));
    });
  });
}

export function makeWebRewardedVisible(): void {
  if (!activeSession?.makeVisible) {
    console.warn('[WebRewardedAds] makeRewardedVisible called without active session.');
    return;
  }

  try {
    activeSession.makeVisible();
  } catch (error) {
    console.error('[WebRewardedAds] makeRewardedVisible failed:', error);
    emitRewardedEvent({ type: 'SLOT_ERROR', error: 'Failed to display rewarded ad.' });
  }
}

export function destroyWebRewardedSlot(): void {
  if (!activeSession) return;

  const { slot, listeners } = activeSession;
  activeSession = null;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore cleanup failures
    }
  });

  withGPT(() => {
    const gt = getGoogletag();
    if (!gt) return;
    try {
      gt.destroySlots([slot]);
    } catch (error) {
      console.warn('[WebRewardedAds] destroySlots error:', error);
    }
  });
}
