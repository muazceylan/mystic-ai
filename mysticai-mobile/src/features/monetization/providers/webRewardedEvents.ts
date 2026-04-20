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
  grantedPayload?: { type: string; amount: number } | null;
  makeRewardedVisible?: () => void;
  error?: string;
}

type Listener = (event: RewardedAdEvent) => void;

const listeners = new Set<Listener>();

export function addRewardedAdListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRewardedEvent(event: RewardedAdEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[WebRewardedEvents] Listener error:', error);
    }
  });
}
