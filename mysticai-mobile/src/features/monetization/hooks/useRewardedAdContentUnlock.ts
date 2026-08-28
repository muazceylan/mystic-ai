import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  checkRewardedAd,
  completeRewardedAd,
} from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { getAdProvider, type AdResult } from '../providers/AdProviderAdapter';
import { isAdMobAvailable, isAdMobInitialized } from '../providers/admobInit';
import { ensureAdProviderReady } from '../providers/initProvider';
import { resolveConfiguredRewardedAd } from '../providers/providerConfig';
import type { RewardedAdCheckResponse, RewardedAdCompleteResponse } from '../types';

type RewardedContentUnlockStatus =
  | 'idle'
  | 'checking'
  | 'loading_ad'
  | 'showing_ad'
  | 'completing'
  | 'success'
  | 'blocked'
  | 'cancelled'
  | 'failed';

interface RewardedProgress {
  completed: number;
  required: number;
}

interface StartRewardedUnlockResult {
  response: RewardedAdCompleteResponse | null;
  status: RewardedContentUnlockStatus;
  message: string | null;
}

interface RewardedUnlockAnalyticsContext {
  contentKey?: string;
  tokenRequirement?: number;
  userGuruBalance?: number;
  rewardedAdViewsRequired?: number;
}

interface UseRewardedAdContentUnlockResult {
  status: RewardedContentUnlockStatus;
  progress: RewardedProgress | null;
  message: string | null;
  startRewardedUnlock: () => Promise<StartRewardedUnlockResult>;
  reset: () => void;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractApiMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: { data?: { message?: unknown; error?: unknown } } }).response;
  const message = response?.data?.message ?? response?.data?.error;
  return typeof message === 'string' && message.trim() ? message : null;
}

const USER_MESSAGES = {
  adNotReady: 'Reklam şu anda hazır değil. Lütfen biraz sonra tekrar deneyin.',
  adLoadFailed: 'Reklam yüklenemedi. Bağlantını kontrol edip tekrar deneyebilirsin.',
  adNotCompleted: 'Reklam tamamlanmadı. İçeriği açmak için videoyu sonuna kadar izlemelisin.',
  adLimitReached: 'Reklam izleme hakkın şimdilik doldu. Daha sonra tekrar deneyebilirsin.',
  contentUnlockFailed: 'İçerik açılırken bir sorun oluştu. Lütfen tekrar deneyin.',
} as const;

function isGenericEnglishMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes('unexpected error')
    || normalized.includes('internal server error')
    || normalized.includes('please try again later')
    || normalized === 'network error';
}

function toUserMessage(message: string | null | undefined, fallback: string): string {
  if (!message || !message.trim() || isGenericEnglishMessage(message)) {
    return fallback;
  }

  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  if (lower.includes('missing_ad_unit') || lower.includes('native_module') || lower.includes('sdk_not_initialized')) {
    return USER_MESSAGES.adNotReady;
  }
  if (lower.includes('ad load') || lower.includes('load failed') || lower.includes('timeout')) {
    return USER_MESSAGES.adLoadFailed;
  }
  if (lower.includes('dismiss') || lower.includes('cancel') || lower.includes('not_completed')) {
    return USER_MESSAGES.adNotCompleted;
  }
  if (lower.includes('limit') || lower.includes('cooldown') || lower.includes('capacity')) {
    return USER_MESSAGES.adLimitReached;
  }

  return normalized;
}

function toApiUserMessage(error: unknown, fallback: string): string {
  return toUserMessage(extractApiMessage(error), fallback);
}

function debugRewardedUnlock(label: string, details: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[RewardedUnlock] ${label}`, details);
  }
}

export function useRewardedAdContentUnlock(
  moduleKey: string,
  actionKey: string,
  contentKey?: string,
  analyticsContext: RewardedUnlockAnalyticsContext = {},
): UseRewardedAdContentUnlockResult {
  const [status, setStatus] = useState<RewardedContentUnlockStatus>('idle');
  const [progress, setProgress] = useState<RewardedProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startRewardedUnlock = useCallback(async (): Promise<StartRewardedUnlockResult> => {
    setMessage(null);
    setStatus('checking');
    const placement = `${moduleKey}_${actionKey}_unlock`;

    debugRewardedUnlock('check:start', {
      moduleKey,
      actionKey,
      contentKey,
      placement,
      tokenRequirement: analyticsContext.tokenRequirement,
      rewardedAdViewsRequired: analyticsContext.rewardedAdViewsRequired,
    });

    let check: RewardedAdCheckResponse;
    try {
      check = await checkRewardedAd(moduleKey, actionKey, contentKey);
      debugRewardedUnlock('check:response', {
        moduleKey,
        actionKey,
        contentKey,
        placement,
        check,
      });
    } catch (error) {
      const failureMessage = toApiUserMessage(error, USER_MESSAGES.contentUnlockFailed);
      setStatus('failed');
      setMessage(failureMessage);
      debugRewardedUnlock('check:failed', {
        moduleKey,
        actionKey,
        contentKey,
        placement,
        error: error instanceof Error ? error.message : String(error),
      });
      trackMonetizationEvent('rewarded_unlock_failed', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        contentKey,
        reason: failureMessage,
        rewardedAdViewsRequired: analyticsContext.rewardedAdViewsRequired,
      });
      return { response: null, status: 'failed', message: failureMessage };
    }

    setProgress({ completed: check.completedViews, required: check.requiredViews });

    if (!check.allowed) {
      const blockedMessage = toUserMessage(check.message, USER_MESSAGES.adLimitReached);
      setStatus('blocked');
      setMessage(blockedMessage);
      trackMonetizationEvent('rewarded_ad_capacity_blocked', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        contentKey,
        reason: check.reason,
        completedViews: check.completedViews,
        requiredViews: check.requiredViews,
        rewardedAdViewsRequired: check.requiredViews,
      });
      debugRewardedUnlock('capacity:blocked', {
        moduleKey,
        actionKey,
        contentKey,
        placement,
        reason: check.reason,
        retryAfterSeconds: check.retryAfterSeconds,
        message: blockedMessage,
      });
      return { response: null, status: 'blocked', message: blockedMessage };
    }

    const resolved = resolveConfiguredRewardedAd();
    if (!resolved) {
      debugRewardedUnlock('ad_unit:missing', { moduleKey, actionKey, contentKey, placement });
      setStatus('failed');
      setMessage(USER_MESSAGES.adNotReady);
      trackMonetizationEvent('rewarded_unlock_failed', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        contentKey,
        reason: 'missing_ad_unit_id',
        completedViews: check.completedViews,
        requiredViews: check.requiredViews,
        rewardedAdViewsRequired: check.requiredViews,
      });
      return { response: null, status: 'failed', message: USER_MESSAGES.adNotReady };
    }

    if (Platform.OS !== 'web') {
      try {
        // Availability first: a missing native module is a build problem and
        // must not be reported as an incomplete privacy bootstrap.
        if (resolved.provider === 'admob' && !isAdMobAvailable()) {
          setStatus('failed');
          setMessage(USER_MESSAGES.adNotReady);
          debugRewardedUnlock('sdk:unavailable', { moduleKey, actionKey, contentKey, placement });
          trackMonetizationEvent('rewarded_unlock_failed', {
            ...analyticsContext,
            moduleKey,
            actionKey,
            contentKey,
            reason: 'native_module_unavailable',
            completedViews: check.completedViews,
            requiredViews: check.requiredViews,
            rewardedAdViewsRequired: check.requiredViews,
          });
          return { response: null, status: 'failed', message: USER_MESSAGES.adNotReady };
        }
        // The startup bootstrap skips SDK init while monetization config is
        // still missing or says ads are off. Config can turn ads on later, so
        // bring the SDK up on demand instead of leaving the offer dead for the
        // rest of the session.
        if (resolved.provider === 'admob' && !isAdMobInitialized() && !(await ensureAdProviderReady())) {
          setStatus('failed');
          setMessage(USER_MESSAGES.adNotReady);
          debugRewardedUnlock('sdk:privacy_bootstrap_incomplete', {
            moduleKey,
            actionKey,
            contentKey,
            placement,
          });
          trackMonetizationEvent('rewarded_unlock_failed', {
            ...analyticsContext,
            moduleKey,
            actionKey,
            contentKey,
            reason: 'privacy_bootstrap_incomplete',
            completedViews: check.completedViews,
            requiredViews: check.requiredViews,
            rewardedAdViewsRequired: check.requiredViews,
          });
          return { response: null, status: 'failed', message: USER_MESSAGES.adNotReady };
        }
      } catch (error) {
        const failureMessage = toUserMessage(
          error instanceof Error ? error.message : null,
          USER_MESSAGES.adNotReady,
        );
        setStatus('failed');
        setMessage(failureMessage);
        debugRewardedUnlock('sdk:failed', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          error: error instanceof Error ? error.message : String(error),
        });
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          reason: 'sdk_init_exception',
          completedViews: check.completedViews,
          requiredViews: check.requiredViews,
          rewardedAdViewsRequired: check.requiredViews,
        });
        return { response: null, status: 'failed', message: failureMessage };
      }
    }

    let completed = check.completedViews;
    const required = check.requiredViews;
    let lastComplete: RewardedAdCompleteResponse | null = null;

    while (completed < required) {
      setProgress({ completed, required });
      setStatus('loading_ad');
      debugRewardedUnlock('ad_load:start', {
        moduleKey,
        actionKey,
        contentKey,
        placement,
        completedViews: completed,
        requiredViews: required,
        adUnitMode: resolved.mode,
      });
      trackMonetizationEvent('rewarded_ad_started', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        contentKey,
        completedViews: completed,
        requiredViews: required,
        rewardedAdViewsRequired: required,
        ad_provider: resolved.provider,
        ad_unit_mode: resolved.mode,
        platform: Platform.OS,
      });

      const adProvider = getAdProvider();
      let loaded = false;
      try {
        loaded = await adProvider.loadRewardedAd(resolved.unitId);
      } catch (error) {
        debugRewardedUnlock('ad_load:exception', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      if (!loaded) {
        setStatus('failed');
        setMessage(USER_MESSAGES.adLoadFailed);
        debugRewardedUnlock('ad_load:failed', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          completedViews: completed,
          requiredViews: required,
        });
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          reason: 'ad_load_failed',
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'failed', message: USER_MESSAGES.adLoadFailed };
      }

      setStatus('showing_ad');
      debugRewardedUnlock('ad_show:start', {
        moduleKey,
        actionKey,
        contentKey,
        placement,
        completedViews: completed,
        requiredViews: required,
      });

      let adResult: AdResult;
      try {
        adResult = await adProvider.showRewardedAd();
      } catch (error) {
        const failureMessage = toUserMessage(
          error instanceof Error ? error.message : null,
          USER_MESSAGES.adLoadFailed,
        );
        setStatus('failed');
        setMessage(failureMessage);
        debugRewardedUnlock('ad_show:failed', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          error: error instanceof Error ? error.message : String(error),
        });
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          reason: 'ad_show_failed',
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'failed', message: failureMessage };
      }
      if (!adResult.completed) {
        const cancelledMessage = USER_MESSAGES.adNotCompleted;
        setStatus('cancelled');
        setMessage(cancelledMessage);
        debugRewardedUnlock('ad_show:cancelled', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          reason: adResult.error ?? 'not_completed',
        });
        trackMonetizationEvent('rewarded_ad_cancelled', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          reason: adResult.error ?? 'not_completed',
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'cancelled', message: cancelledMessage };
      }

      setStatus('completing');
      try {
        debugRewardedUnlock('complete:start', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          completedViews: completed,
          requiredViews: required,
        });
        const complete = await completeRewardedAd(moduleKey, actionKey, {
          // TODO(levelplay-s2s-content): this endpoint records content-unlock
          // progress only. Guru Token credit for LevelPlay is exclusively S2S.
          adNetwork: resolved.provider,
          placement,
          transactionId: adResult.transactionId ?? createId(`${resolved.provider}_reward`),
          clientEventId: createId('rewarded_unlock_event'),
          contentKey,
        });
        lastComplete = complete;
        completed = complete.completedViews;
        setProgress({ completed, required: complete.requiredViews });
        debugRewardedUnlock('complete:response', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          complete,
        });

        trackMonetizationEvent('rewarded_ad_completed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          completedViews: complete.completedViews,
          requiredViews: complete.requiredViews,
          rewardedAdViewsRequired: complete.requiredViews,
        });

        if (complete.unlocked) {
          setStatus('success');
          setMessage(complete.message ?? null);
          trackMonetizationEvent('rewarded_unlock_success', {
            ...analyticsContext,
            moduleKey,
            actionKey,
            contentKey,
            completedViews: complete.completedViews,
            requiredViews: complete.requiredViews,
            rewardedAdViewsRequired: complete.requiredViews,
          });
          return { response: complete, status: 'success', message: complete.message ?? null };
        }
      } catch (error) {
        const apiMessage = toApiUserMessage(error, USER_MESSAGES.contentUnlockFailed);
        setStatus('failed');
        setMessage(apiMessage);
        debugRewardedUnlock('complete:failed', {
          moduleKey,
          actionKey,
          contentKey,
          placement,
          error: error instanceof Error ? error.message : String(error),
          message: apiMessage,
        });
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          contentKey,
          reason: apiMessage ?? (error instanceof Error ? error.message : 'complete_failed'),
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'failed', message: apiMessage };
      }
    }

    const finalMessage = lastComplete?.message
      ? toUserMessage(lastComplete.message, USER_MESSAGES.contentUnlockFailed)
      : USER_MESSAGES.contentUnlockFailed;
    if (!lastComplete?.unlocked) {
      setStatus('failed');
      setMessage(finalMessage);
      trackMonetizationEvent('rewarded_unlock_failed', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        contentKey,
        reason: 'required_views_not_unlocked',
        completedViews: completed,
        requiredViews: required,
        rewardedAdViewsRequired: required,
      });
    }

    return {
      response: lastComplete,
      status: lastComplete?.unlocked ? 'success' : 'failed',
      message: finalMessage,
    };
  }, [actionKey, analyticsContext, contentKey, moduleKey]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setMessage(null);
  }, []);

  return { status, progress, message, startRewardedUnlock, reset };
}
