/**
 * GPT rewarded-ad slot orchestration.
 *
 * Responsibilities:
 * - Define, request, and destroy a single rewarded out-of-page slot.
 * - Wire GPT lifecycle events to the internal event bus (rewardedEvents.ts).
 * - Enforce: no ad shown without explicit user consent.
 * - Enforce: single active slot at a time.
 * - Safe cleanup on route changes and component unmount.
 *
 * This module is pure JavaScript (no React). React state lives in useRewardedAd.ts.
 */

import { withGPT, getGoogletag, loadGPT } from './gpt';
import { emitRewardedEvent } from './rewardedEvents';

interface ActiveSession {
  slot: Slot;
  makeVisible?: () => void;
  adSessionId: string;
  listeners: Array<() => void>; // GPT event listener cleanup handles
}

let activeSession: ActiveSession | null = null;

/** Returns true if there is already an active rewarded slot. */
export function hasActiveRewardedSession(): boolean {
  return activeSession !== null;
}

/**
 * Requests a rewarded ad for the given ad unit path.
 *
 * Steps:
 * 1. Loads GPT script (idempotent).
 * 2. Defines an out-of-page rewarded slot.
 * 3. Registers GPT event listeners.
 * 4. Calls display() to fetch ad creative.
 *
 * The slot does NOT become visible here. Visibility is gated on user consent
 * in the UI. Only after the user accepts, call `makeRewardedVisible()`.
 *
 * @param adUnitPath   GAM ad unit path e.g. "/12345/mysticai/rewarded_earn"
 * @param adSessionId  Client-generated session nonce (UUID)
 * @returns            "ready" | "unsupported" | "error"
 */
export async function requestRewardedAd(
  adUnitPath: string,
  adSessionId: string
): Promise<'ready' | 'unsupported' | 'error'> {
  // Prevent multiple concurrent sessions.
  if (activeSession !== null) {
    console.warn('[RewardedAds] Session already active; destroying previous slot.');
    destroyRewardedSlot();
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

      // Out-of-page rewarded format.
      const slot = gt.defineOutOfPageSlot(adUnitPath, googletag.OutOfPageFormat.REWARDED);
      if (!slot) {
        // GPT returns null when the environment doesn't support rewarded ads
        // (e.g., mobile browser, iframe, ad blocker at slot-define level).
        emitRewardedEvent({ type: 'SLOT_ERROR', error: 'Rewarded format not supported.' });
        resolve('unsupported');
        return;
      }

      slot.addService(gt.pubads());

      const sessionListeners: Array<() => void> = [];

      // ── rewardedSlotReady ──────────────────────────────────────────────
      const onReady = (event: RewardedSlotReadyEvent): void => {
        if (event.slot !== slot) return;
        // Store the makeRewardedVisible callback; it will be called after consent.
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

      // ── rewardedSlotGranted ────────────────────────────────────────────
      const onGranted = (event: RewardedSlotGrantedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({
          type: 'SLOT_GRANTED',
          adSessionId,
          grantedPayload: event.payload,
        });
      };

      // ── rewardedSlotClosed ─────────────────────────────────────────────
      const onClosed = (event: RewardedSlotClosedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({ type: 'SLOT_CLOSED', adSessionId });
        // Slot is now invalid; destroy it.
        destroyRewardedSlot();
      };

      // ── rewardedSlotVideoCompleted ────────────────────────────────────
      const onVideoCompleted = (event: RewardedSlotVideoCompletedEvent): void => {
        if (event.slot !== slot) return;
        emitRewardedEvent({ type: 'SLOT_VIDEO_COMPLETED', adSessionId });
      };

      // ── slotRenderEnded (detect no-fill) ──────────────────────────────
      const onRenderEnded = (event: SlotRenderEndedEvent): void => {
        if (event.slot !== slot) return;
        if (event.isEmpty) {
          emitRewardedEvent({ type: 'SLOT_NO_FILL', adSessionId });
          destroyRewardedSlot();
          resolve('error'); // Will be treated as no-fill in the hook.
        }
      };

      gt.pubads().addEventListener('rewardedSlotReady', onReady);
      gt.pubads().addEventListener('rewardedSlotGranted', onGranted);
      gt.pubads().addEventListener('rewardedSlotClosed', onClosed);
      gt.pubads().addEventListener('rewardedSlotVideoCompleted', onVideoCompleted);
      gt.pubads().addEventListener('slotRenderEnded', onRenderEnded);

      // Track listeners for cleanup (GPT doesn't expose removeEventListener,
      // so we destroy the slot to clean up).
      activeSession = {
        slot,
        adSessionId,
        listeners: sessionListeners,
      };

      gt.enableServices();
      gt.display(slot);

      // Timeout guard: if ad isn't ready within 15s, emit no-fill.
      const timeoutId = setTimeout(() => {
        if (activeSession?.adSessionId === adSessionId) {
          emitRewardedEvent({ type: 'SLOT_NO_FILL', adSessionId, error: 'Ad request timed out.' });
          destroyRewardedSlot();
          resolve('error');
        }
      }, 15_000);

      // Store timeout id on the session for cleanup.
      sessionListeners.push(() => clearTimeout(timeoutId));
    });
  });
}

/**
 * Makes the rewarded ad visible (shows it to the user).
 * MUST only be called after the user has explicitly consented.
 * Uses the makeRewardedVisible callback provided by GPT in the rewardedSlotReady event.
 */
export function makeRewardedVisible(): void {
  if (!activeSession?.makeVisible) {
    console.warn('[RewardedAds] makeRewardedVisible called but no active session or callback.');
    return;
  }
  try {
    activeSession.makeVisible();
  } catch (err) {
    console.error('[RewardedAds] makeRewardedVisible threw:', err);
    emitRewardedEvent({ type: 'SLOT_ERROR', error: 'Failed to display rewarded ad.' });
  }
}

/**
 * Destroys the active rewarded slot and cleans up all listeners.
 * Safe to call multiple times.
 */
export function destroyRewardedSlot(): void {
  if (!activeSession) return;

  const { slot, listeners } = activeSession;
  activeSession = null;

  // Run cleanup callbacks (timeouts, etc.)
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

  withGPT(() => {
    const gt = getGoogletag();
    if (gt) {
      try {
        gt.destroySlots([slot]);
      } catch (err) {
        console.warn('[RewardedAds] destroySlots error:', err);
      }
    }
  });
}
