/**
 * Internal event bus for rewarded-ad lifecycle events.
 *
 * Components and hooks communicate via these typed events instead of
 * prop drilling, keeping the GPT callback layer decoupled from React state.
 *
 * Event flow:
 *   GPT callback → emitRewardedEvent() → useRewardedAd hook listener → state update
 */

export type RewardedAdEventType =
  | 'SLOT_READY'
  | 'SLOT_GRANTED'
  | 'SLOT_CLOSED'
  | 'SLOT_VIDEO_COMPLETED'
  | 'SLOT_NO_FILL'
  | 'SLOT_ERROR';

export interface RewardedAdEvent {
  type: RewardedAdEventType;
  adSessionId?: string;
  /** Raw GPT grant payload (type + amount) for audit logging. */
  grantedPayload?: { type: string; amount: number } | null;
  /** Callback provided by GPT to make the ad visible — must be called after user consent. */
  makeRewardedVisible?: () => void;
  error?: string;
}

type Listener = (event: RewardedAdEvent) => void;

// Module-level singleton listener set (only one active session at a time).
const listeners = new Set<Listener>();

export function addRewardedAdListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRewardedEvent(event: RewardedAdEvent): void {
  listeners.forEach((l) => {
    try {
      l(event);
    } catch (err) {
      console.error('[RewardedEvents] Listener error:', err);
    }
  });
}
