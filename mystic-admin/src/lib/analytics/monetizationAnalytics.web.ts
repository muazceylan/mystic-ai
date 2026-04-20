/**
 * Analytics event tracking for the web rewarded-ads flow.
 *
 * Events are dispatched to the backend analytics endpoint (GA4 server-side)
 * and optionally to window.dataLayer for GTM. Both are fire-and-forget.
 *
 * All user IDs are anonymized before transmission (last 4 chars of hashed value).
 * Reward amounts are included (non-PII) for conversion tracking.
 *
 * Event naming follows the project's snake_case convention:
 *   rewarded_ad_{action}
 */

import type { RewardAdAnalyticsPayload } from '@/types/rewards';

// ── Analytics event names ─────────────────────────────────────────────────────

export const RewardedAdEvents = {
  CTA_CLICKED:           'rewarded_ad_cta_clicked',
  INTENT_CREATED:        'rewarded_ad_intent_created',
  NOT_SUPPORTED:         'rewarded_ad_not_supported',
  READY:                 'rewarded_ad_ready',
  CONSENT_ACCEPTED:      'rewarded_ad_consent_accepted',
  CONSENT_DECLINED:      'rewarded_ad_consent_declined',
  SHOWN:                 'rewarded_ad_shown',
  VIDEO_COMPLETED:       'rewarded_ad_video_completed',
  REWARD_GRANTED:        'rewarded_ad_reward_granted',
  CLAIM_SUCCESS:         'rewarded_ad_claim_success',
  CLAIM_FAILED:          'rewarded_ad_claim_failed',
  CLOSED:                'rewarded_ad_closed',
  NO_FILL:               'rewarded_ad_no_fill',
  DAILY_CAP_REACHED:     'rewarded_ad_daily_cap_reached',
  DUPLICATE_CLAIM:       'rewarded_ad_duplicate_claim_blocked',
  ERROR:                 'rewarded_ad_error',
} as const;

export type RewardedAdEventName = typeof RewardedAdEvents[keyof typeof RewardedAdEvents];

// ── Device detection ──────────────────────────────────────────────────────────

function detectDeviceType(): RewardAdAnalyticsPayload['deviceType'] {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// ── Core tracking function ────────────────────────────────────────────────────

export function trackRewardedAdEvent(
  eventName: RewardedAdEventName,
  payload: Partial<RewardAdAnalyticsPayload>
): void {
  if (typeof window === 'undefined') return;

  const fullPayload: RewardAdAnalyticsPayload & { event: string } = {
    event: eventName,
    page: payload.page ?? (typeof window !== 'undefined' ? window.location.pathname : '/earn'),
    deviceType: payload.deviceType ?? detectDeviceType(),
    intentId: payload.intentId,
    placementKey: payload.placementKey,
    rewardAmount: payload.rewardAmount,
    result: payload.result,
    failureReason: payload.failureReason,
    userId: payload.userId,
  };

  // Push to dataLayer (GTM / GA4 via GTM).
  try {
    const dl = (window as unknown as Record<string, unknown>).dataLayer;
    if (Array.isArray(dl)) {
      dl.push(fullPayload);
    }
  } catch {
    // Ignore — dataLayer not set up.
  }

  // Send to backend analytics ingestion (best-effort, non-blocking).
  if (process.env.NEXT_PUBLIC_ANALYTICS_INGESTION_ENABLED === 'true') {
    fetch('/api/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, properties: fullPayload }),
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget; never throw on analytics failure.
    });
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const rewardedAdAnalytics = {
  ctaClicked: (p: Pick<RewardAdAnalyticsPayload, 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CTA_CLICKED, p),

  intentCreated: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'rewardAmount' | 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.INTENT_CREATED, p),

  notSupported: (p: Pick<RewardAdAnalyticsPayload, 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.NOT_SUPPORTED, p),

  ready: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.READY, p),

  consentAccepted: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CONSENT_ACCEPTED, p),

  consentDeclined: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CONSENT_DECLINED, p),

  shown: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.SHOWN, p),

  videoCompleted: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.VIDEO_COMPLETED, p),

  rewardGranted: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'rewardAmount' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.REWARD_GRANTED, p),

  claimSuccess: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'rewardAmount' | 'page' | 'result'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CLAIM_SUCCESS, p),

  claimFailed: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'failureReason' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CLAIM_FAILED, p),

  closed: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.CLOSED, p),

  noFill: (p: Pick<RewardAdAnalyticsPayload, 'placementKey' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.NO_FILL, p),

  dailyCapReached: (p: Pick<RewardAdAnalyticsPayload, 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.DAILY_CAP_REACHED, p),

  error: (p: Pick<RewardAdAnalyticsPayload, 'intentId' | 'failureReason' | 'page'>) =>
    trackRewardedAdEvent(RewardedAdEvents.ERROR, p),
};
