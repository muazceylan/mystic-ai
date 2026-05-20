import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  checkRewardedAd,
  completeRewardedAd,
} from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { getAdProvider } from '../providers/AdProviderAdapter';
import { initializeAdMob, isAdMobAvailable, isAdMobInitialized } from '../providers/admobInit';
import { resolveRewardedUnitId } from '../providers/admobUnitIds';
import { initializeAdProvider } from '../providers/initProvider';
import type { RewardedAdCompleteResponse } from '../types';

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

export function useRewardedAdContentUnlock(
  moduleKey: string,
  actionKey: string,
  analyticsContext: RewardedUnlockAnalyticsContext = {},
): UseRewardedAdContentUnlockResult {
  const [status, setStatus] = useState<RewardedContentUnlockStatus>('idle');
  const [progress, setProgress] = useState<RewardedProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startRewardedUnlock = useCallback(async (): Promise<StartRewardedUnlockResult> => {
    setMessage(null);
    setStatus('checking');

    const check = await checkRewardedAd(moduleKey, actionKey);
    setProgress({ completed: check.completedViews, required: check.requiredViews });

    if (!check.allowed) {
      setStatus('blocked');
      setMessage(check.message ?? null);
      trackMonetizationEvent('rewarded_ad_capacity_blocked', {
        ...analyticsContext,
        moduleKey,
        actionKey,
        reason: check.reason,
        completedViews: check.completedViews,
        requiredViews: check.requiredViews,
        rewardedAdViewsRequired: check.requiredViews,
      });
      return { response: null, status: 'blocked', message: check.message ?? null };
    }

    const resolved = resolveRewardedUnitId();
    if (!resolved) {
      setStatus('failed');
      setMessage(null);
      return { response: null, status: 'failed', message: null };
    }

    if (Platform.OS !== 'web') {
      await initializeAdProvider(true);
      if (!isAdMobAvailable()) {
        setStatus('failed');
        return { response: null, status: 'failed', message: null };
      }
      if (!isAdMobInitialized()) {
        const initialized = await initializeAdMob();
        if (!initialized) {
          setStatus('failed');
          return { response: null, status: 'failed', message: null };
        }
      }
    }

    let completed = check.completedViews;
    const required = check.requiredViews;
    let lastComplete: RewardedAdCompleteResponse | null = null;

    while (completed < required) {
      setProgress({ completed, required });
      setStatus('loading_ad');
        trackMonetizationEvent('rewarded_ad_started', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
          ad_provider: 'admob',
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
      });

      const adProvider = getAdProvider();
      const loaded = await adProvider.loadRewardedAd(resolved.unitId);
      if (!loaded) {
        setStatus('failed');
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          reason: 'ad_load_failed',
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'failed', message: null };
      }

      setStatus('showing_ad');
      const adResult = await adProvider.showRewardedAd();
      if (!adResult.completed) {
        setStatus('cancelled');
        trackMonetizationEvent('rewarded_ad_cancelled', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          reason: adResult.error ?? 'not_completed',
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'cancelled', message: null };
      }

      setStatus('completing');
      try {
        const complete = await completeRewardedAd(moduleKey, actionKey, {
          adNetwork: 'admob',
          placement: `${moduleKey}_${actionKey}_unlock`,
          transactionId: adResult.transactionId ?? createId('admob_reward'),
          clientEventId: createId('rewarded_unlock_event'),
        });
        lastComplete = complete;
        completed = complete.completedViews;
        setProgress({ completed, required: complete.requiredViews });

        trackMonetizationEvent('rewarded_ad_completed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
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
            completedViews: complete.completedViews,
            requiredViews: complete.requiredViews,
            rewardedAdViewsRequired: complete.requiredViews,
          });
          return { response: complete, status: 'success', message: complete.message ?? null };
        }
      } catch (error) {
        const apiMessage = extractApiMessage(error);
        setStatus('failed');
        setMessage(apiMessage);
        trackMonetizationEvent('rewarded_unlock_failed', {
          ...analyticsContext,
          moduleKey,
          actionKey,
          reason: apiMessage ?? (error instanceof Error ? error.message : 'complete_failed'),
          completedViews: completed,
          requiredViews: required,
          rewardedAdViewsRequired: required,
        });
        return { response: null, status: 'failed', message: apiMessage };
      }
    }

    return {
      response: lastComplete,
      status: lastComplete?.unlocked ? 'success' : 'failed',
      message: lastComplete?.message ?? null,
    };
  }, [actionKey, analyticsContext, moduleKey]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setMessage(null);
  }, []);

  return { status, progress, message, startRewardedUnlock, reset };
}
