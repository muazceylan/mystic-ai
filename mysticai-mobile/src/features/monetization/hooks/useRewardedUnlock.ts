import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useSubscription } from './useSubscription';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import {
  claimWebReward,
  createWebRewardIntent,
  markWebRewardIntentReady,
  processReward,
} from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { getAdProvider } from '../providers/AdProviderAdapter';
import { resolveConfiguredRewardedAd } from '../providers/providerConfig';
import { isAdMobAvailable, isAdMobInitialized } from '../providers/admobInit';
import { ensureAdProviderReady } from '../providers/initProvider';
import { addRewardedAdListener } from '../providers/webRewardedEvents';
import {
  destroyWebRewardedSlot,
  makeWebRewardedVisible,
  requestWebRewardedAd,
  resolveWebRewardedAdUnitPath,
} from '../providers/webRewardedAds';

type UnlockStatus = 'idle' | 'loading_ad' | 'showing_ad' | 'processing_reward' | 'success' | 'failed';

interface UseRewardedUnlockResult {
  status: UnlockStatus;
  /** Reason of the last failure (analytics reason string), null while healthy. */
  failureReason: string | null;
  /**
   * Same value, read from a ref. Callers that await `startRewardedUnlock()` need
   * this: their closure still holds the render-time `failureReason`.
   */
  getFailureReason: () => string | null;
  startRewardedUnlock: () => Promise<boolean>;
  reset: () => void;
}

/**
 * Emits an ineligible_reason event with structured properties and returns false.
 * Centralizes the "can't show ad" exit path.
 */
function emitIneligible(
  reason: string,
  moduleKey: string,
  actionKey?: string,
  configVersion?: number,
): false {
  trackMonetizationEvent('ineligible_reason', {
    module_key: moduleKey,
    action_key: actionKey,
    reason,
    ad_provider: 'admob',
    platform: Platform.OS,
    config_version: configVersion,
  });
  return false;
}

function createClientEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useRewardedUnlock(moduleKey: string, actionKey?: string): UseRewardedUnlockResult {
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const [failureReason, setFailureReasonState] = useState<string | null>(null);
  const failureReasonRef = useRef<string | null>(null);
  const setFailureReason = useCallback((reason: string | null) => {
    failureReasonRef.current = reason;
    setFailureReasonState(reason);
  }, []);
  const getFailureReason = useCallback(() => failureReasonRef.current, []);
  const { config, getModuleRule, isAdsEnabledForModule, trackAdOffer, trackAdCompleted } =
    useMonetizationStore();
  const { refreshBalance } = useGuruWalletStore();
  const subscription = useSubscription();
  const premiumAccessActive = subscription.isPremium;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    return () => {
      destroyWebRewardedSlot();
    };
  }, []);

  const startWebRewardedUnlock = useCallback(async (): Promise<boolean> => {
    const configVersion = config?.configVersion;

    if (!config) {
      setStatus('failed');
      return emitIneligible('config_not_loaded', moduleKey, actionKey);
    }

    if (premiumAccessActive) {
      setStatus('failed');
      return emitIneligible('premium_ad_free', moduleKey, actionKey, configVersion);
    }

    if (!config.enabled || !config.adsEnabled || !config.webAdsEnabled) {
      setStatus('failed');
      return emitIneligible('ads_disabled_globally', moduleKey, actionKey, configVersion);
    }

    if (!isAdsEnabledForModule(moduleKey)) {
      setStatus('failed');
      return emitIneligible('ads_disabled_for_module', moduleKey, actionKey, configVersion);
    }

    const rule = getModuleRule(moduleKey);
    if (!rule) {
      setStatus('failed');
      return emitIneligible('action_not_eligible', moduleKey, actionKey, configVersion);
    }

    try {
      setStatus('loading_ad');
      trackAdOffer(moduleKey);

      const pageContext =
        typeof window !== 'undefined' ? window.location.pathname || '/earn' : '/earn';
      const clientEventId = createClientEventId();
      const intent = await createWebRewardIntent(pageContext);

      return await new Promise<boolean>(async (resolve) => {
        let settled = false;

        const finalize = (result: boolean) => {
          if (settled) return;
          settled = true;
          unsubscribe();
          if (!result) {
            destroyWebRewardedSlot();
          }
          resolve(result);
        };

        const unsubscribe = addRewardedAdListener(async (event) => {
          if (settled) return;

          switch (event.type) {
            case 'SLOT_READY':
              try {
                if (event.adSessionId) {
                  await markWebRewardIntentReady(intent.intentId, {
                    adSessionId: event.adSessionId,
                    clientEventId,
                  });
                }
              } catch {
                // Telemetry-only endpoint; do not block ad display.
              }
              setStatus('showing_ad');
              makeWebRewardedVisible();
              break;

            case 'SLOT_GRANTED':
              try {
                setStatus('processing_reward');
                const claim = await claimWebReward(intent.intentId, {
                  adSessionId: event.adSessionId ?? '',
                  clientEventId,
                  pageContext,
                  userAgentSnapshot:
                    typeof navigator !== 'undefined' ? navigator.userAgent : '',
                  grantedPayloadSummary: event.grantedPayload
                    ? JSON.stringify(event.grantedPayload)
                    : undefined,
                });

                trackAdCompleted(moduleKey);
                await refreshBalance();

                trackMonetizationEvent('rewarded_ad_completed', {
                  module_key: moduleKey,
                  action_key: actionKey,
                  reward_amount: claim.grantedAmount,
                  ad_provider: 'gpt_web',
                  platform: Platform.OS,
                  result: claim.idempotentReplay ? 'idempotent_replay' : 'success',
                  config_version: configVersion,
                });

                setStatus('success');
                finalize(true);
              } catch (error) {
                trackMonetizationEvent('rewarded_ad_failed', {
                  module_key: moduleKey,
                  action_key: actionKey,
                  reason: error instanceof Error ? error.message : 'web_claim_failed',
                  ad_provider: 'gpt_web',
                  platform: Platform.OS,
                  config_version: configVersion,
                });
                setStatus('failed');
                finalize(false);
              }
              break;

            case 'SLOT_NO_FILL':
            case 'SLOT_CLOSED':
            case 'SLOT_ERROR':
              trackMonetizationEvent('rewarded_ad_failed', {
                module_key: moduleKey,
                action_key: actionKey,
                reason: event.error ?? event.type.toLowerCase(),
                ad_provider: 'gpt_web',
                platform: Platform.OS,
                config_version: configVersion,
              });
              setStatus('failed');
              finalize(false);
              break;

            case 'SLOT_VIDEO_COMPLETED':
              break;
          }
        });

        const requestResult = await requestWebRewardedAd(
          resolveWebRewardedAdUnitPath(intent.adConfig.adUnitPath) ?? '',
          createClientEventId(),
        );

        if (requestResult === 'unsupported') {
          setStatus('failed');
          finalize(false);
          return;
        }

        if (requestResult === 'error') {
          setStatus('failed');
          finalize(false);
        }
      });
    } catch (error) {
      trackMonetizationEvent('rewarded_ad_failed', {
        module_key: moduleKey,
        action_key: actionKey,
        reason: error instanceof Error ? error.message : 'web_rewarded_failed',
        ad_provider: 'gpt_web',
        platform: Platform.OS,
        config_version: configVersion,
      });
      setStatus('failed');
      return false;
    }
  }, [
    actionKey,
    config,
    getModuleRule,
    isAdsEnabledForModule,
    moduleKey,
    premiumAccessActive,
    refreshBalance,
    trackAdCompleted,
    trackAdOffer,
  ]);

  const startRewardedUnlock = useCallback(async (): Promise<boolean> => {
    const configVersion = config?.configVersion;

    if (Platform.OS === 'web') {
      return startWebRewardedUnlock();
    }

    const fail = (reason: string): false => {
      setFailureReason(reason);
      setStatus('failed');
      return emitIneligible(reason, moduleKey, actionKey, configVersion);
    };

    setFailureReason(null);

    // ── Guard 1: config loaded ─────────────────────────────────────
    if (!config) {
      return fail('config_not_loaded');
    }

    if (premiumAccessActive) {
      return fail('premium_ad_free');
    }

    // ── Guard 2: global ads enabled ────────────────────────────────
    if (!config.enabled || !config.adsEnabled) {
      return fail('ads_disabled_globally');
    }

    // ── Guard 3: module-level ads enabled ──────────────────────────
    if (!isAdsEnabledForModule(moduleKey)) {
      return fail('ads_disabled_for_module');
    }

    // ── Guard 4: module rule exists ────────────────────────────────
    const rule = getModuleRule(moduleKey);
    if (!rule) {
      return fail('action_not_eligible');
    }

    // ── Guard 5: ad unit ID available ──────────────────────────────
    const resolved = resolveConfiguredRewardedAd();
    if (!resolved) {
      // resolveRewardedUnitId already emits missing_ad_unit_id event
      setFailureReason('missing_ad_unit_id');
      setStatus('failed');
      return false;
    }

    // ── Guard 6: native SDK available + initialized ───────────────
    // Availability first: a missing native module is a build problem, and
    // reporting it as an incomplete privacy bootstrap sent us down the wrong
    // trail before.
    if (resolved.provider === 'admob') {
      if (!isAdMobAvailable()) {
        return fail('native_module_unavailable');
      }

      // The startup bootstrap skips SDK init when monetization config was not
      // loaded yet (or said ads were off). Ads can be enabled by a later config
      // refresh, so bring the SDK up on demand rather than leaving the offer
      // dead until the next cold start.
      if (!isAdMobInitialized()) {
        setStatus('loading_ad');
        const ready = await ensureAdProviderReady();
        if (!ready) {
          return fail('privacy_bootstrap_incomplete');
        }
      }
    }

    // ── All guards passed — proceed with ad flow ───────────────────
    try {
      setStatus('loading_ad');
      trackAdOffer(moduleKey);

      trackMonetizationEvent('rewarded_ad_started', {
        module_key: moduleKey,
        action_key: actionKey,
        ad_provider: resolved.provider,
        ad_unit_mode: resolved.mode,
        platform: Platform.OS,
        config_version: configVersion,
      });

      const adProvider = getAdProvider();
      const loaded = await adProvider.loadRewardedAd(resolved.unitId);

      if (!loaded) {
        trackMonetizationEvent('rewarded_ad_failed', {
          module_key: moduleKey,
          action_key: actionKey,
          reason: 'ad_load_failed',
          ad_provider: resolved.provider,
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
          config_version: configVersion,
        });
        setFailureReason('ad_load_failed');
        setStatus('failed');
        return false;
      }

      setStatus('showing_ad');
      const result = await adProvider.showRewardedAd();

      if (!result.completed) {
        trackMonetizationEvent('rewarded_ad_dismissed', {
          module_key: moduleKey,
          action_key: actionKey,
          reason: result.error ?? 'user_dismissed',
          ad_provider: resolved.provider,
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
          config_version: configVersion,
        });
        setFailureReason(result.error ?? 'user_dismissed');
        setStatus('failed');
        return false;
      }

      // ── Reward earned — process on backend ─────────────────────
      setStatus('processing_reward');

      const action = actionKey ? getModuleRule(moduleKey) && config.actions.find(a => a.actionKey === actionKey && a.moduleKey === moduleKey) : undefined;
      const rewardAmount = action?.rewardAmount && action.rewardAmount > 0
        ? action.rewardAmount
        : rule.guruRewardAmountPerCompletedAd;

      if (resolved.provider === 'admob') {
        // Existing AdMob compatibility path. LevelPlay never calls this client
        // amount endpoint; its single token is settled by the signed S2S callback.
        const idempotencyKey = `reward_${moduleKey}_${actionKey ?? 'general'}_${Date.now()}`;
        await processReward({
          amount: rewardAmount,
          sourceKey: 'rewarded_ad_admob',
          moduleKey,
          actionKey,
          platform: Platform.OS,
          locale: i18n.language,
          idempotencyKey,
        });
      }

      trackAdCompleted(moduleKey);
      await refreshBalance();

      trackMonetizationEvent('rewarded_ad_completed', {
        module_key: moduleKey,
        action_key: actionKey,
        reward_amount: rewardAmount,
        ad_provider: resolved.provider,
        ad_unit_mode: resolved.mode,
        platform: Platform.OS,
        result: 'success',
        config_version: configVersion,
      });

      setStatus('success');
      return true;
    } catch (error) {
      trackMonetizationEvent('rewarded_ad_failed', {
        module_key: moduleKey,
        action_key: actionKey,
        reason: error instanceof Error ? error.message : 'unknown',
        ad_provider: resolved?.provider ?? 'unknown',
        platform: Platform.OS,
        config_version: configVersion,
      });
      setFailureReason(error instanceof Error ? error.message : 'unknown');
      setStatus('failed');
      return false;
    }
  }, [
    moduleKey,
    actionKey,
    startWebRewardedUnlock,
    config,
    getModuleRule,
    isAdsEnabledForModule,
    premiumAccessActive,
    setFailureReason,
    trackAdOffer,
    trackAdCompleted,
    refreshBalance,
  ]);

  const reset = useCallback(() => {
    setStatus('idle');
    setFailureReason(null);
  }, [setFailureReason]);

  return { status, failureReason, getFailureReason, startRewardedUnlock, reset };
}
