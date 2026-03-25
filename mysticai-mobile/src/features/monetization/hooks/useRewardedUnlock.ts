import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { processReward } from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { getAdProvider } from '../providers/AdProviderAdapter';
import { resolveRewardedUnitId } from '../providers/admobUnitIds';
import { initializeAdMob, isAdMobAvailable, isAdMobInitialized } from '../providers/admobInit';
import { initializeAdProvider } from '../providers/initProvider';

type UnlockStatus = 'idle' | 'loading_ad' | 'showing_ad' | 'processing_reward' | 'success' | 'failed';

interface UseRewardedUnlockResult {
  status: UnlockStatus;
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

export function useRewardedUnlock(moduleKey: string, actionKey?: string): UseRewardedUnlockResult {
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const { config, getModuleRule, isAdsEnabledForModule, trackAdOffer, trackAdCompleted } =
    useMonetizationStore();
  const { refreshBalance } = useGuruWalletStore();

  const startRewardedUnlock = useCallback(async (): Promise<boolean> => {
    const configVersion = config?.configVersion;

    // ── Guard 1: config loaded ─────────────────────────────────────
    if (!config) {
      setStatus('failed');
      return emitIneligible('config_not_loaded', moduleKey, actionKey);
    }

    // ── Guard 2: global ads enabled ────────────────────────────────
    if (!config.enabled || !config.adsEnabled) {
      setStatus('failed');
      return emitIneligible('ads_disabled_globally', moduleKey, actionKey, configVersion);
    }

    // ── Guard 3: module-level ads enabled ──────────────────────────
    if (!isAdsEnabledForModule(moduleKey)) {
      setStatus('failed');
      return emitIneligible('ads_disabled_for_module', moduleKey, actionKey, configVersion);
    }

    // ── Guard 4: module rule exists ────────────────────────────────
    const rule = getModuleRule(moduleKey);
    if (!rule) {
      setStatus('failed');
      return emitIneligible('action_not_eligible', moduleKey, actionKey, configVersion);
    }

    // ── Guard 5: ad unit ID available ──────────────────────────────
    const resolved = resolveRewardedUnitId();
    if (!resolved) {
      // resolveRewardedUnitId already emits missing_ad_unit_id event
      setStatus('failed');
      return false;
    }

    // ── Guard 6: native SDK available + initialized ───────────────
    await initializeAdProvider(config.adsEnabled);

    if (!isAdMobAvailable()) {
      setStatus('failed');
      return emitIneligible('native_module_unavailable', moduleKey, actionKey, configVersion);
    }

    if (!isAdMobInitialized()) {
      const initOk = await initializeAdMob();
      if (!initOk) {
        setStatus('failed');
        return emitIneligible('admob_init_failed', moduleKey, actionKey, configVersion);
      }
    }

    // ── All guards passed — proceed with ad flow ───────────────────
    try {
      setStatus('loading_ad');
      trackAdOffer(moduleKey);

      trackMonetizationEvent('rewarded_ad_started', {
        module_key: moduleKey,
        action_key: actionKey,
        ad_provider: 'admob',
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
          ad_provider: 'admob',
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
          config_version: configVersion,
        });
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
          ad_provider: 'admob',
          ad_unit_mode: resolved.mode,
          platform: Platform.OS,
          config_version: configVersion,
        });
        setStatus('failed');
        return false;
      }

      // ── Reward earned — process on backend ─────────────────────
      setStatus('processing_reward');

      const rewardAmount = rule.guruRewardAmountPerCompletedAd;
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

      trackAdCompleted(moduleKey);
      await refreshBalance();

      trackMonetizationEvent('rewarded_ad_completed', {
        module_key: moduleKey,
        action_key: actionKey,
        reward_amount: rewardAmount,
        ad_provider: 'admob',
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
        ad_provider: 'admob',
        platform: Platform.OS,
        config_version: configVersion,
      });
      setStatus('failed');
      return false;
    }
  }, [
    moduleKey,
    actionKey,
    config,
    getModuleRule,
    isAdsEnabledForModule,
    trackAdOffer,
    trackAdCompleted,
    refreshBalance,
  ]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, startRewardedUnlock, reset };
}
