import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { getAdBlockReason } from '../providers/admobUnitIds';
import { isAdMobAvailable } from '../providers/admobInit';
import { useEntitlements } from './useEntitlements';
import { usePaywall } from './usePaywall';
import type { ModuleRule, ActionConfig, ActionUnlockState, PremiumBehavior, EntitlementStatus } from '../types';

interface ModuleMonetizationResult {
  isLoading: boolean;
  configLoaded: boolean;
  rule: ModuleRule | undefined;
  adsEnabled: boolean;
  guruEnabled: boolean;
  shouldShowAd: boolean;
  /** True when the ad system can serve ads in the current runtime (config + unit ID + native availability). */
  isAdReady: boolean;
  /** If isAdReady is false, the reason why. Null when ready. */
  adBlockReason: string | null;
  walletBalance: number;
  isPurchaseAvailable: boolean;
  premiumActive: boolean;
  trialing: boolean;
  entitlementStatus: EntitlementStatus;
  premiumBehavior?: PremiumBehavior;
  premiumApplied?: boolean;
  premiumCanUnlock?: boolean;
  tokenPurchaseAvailable?: boolean;
  rewardedAdAvailable?: boolean;
  getAction: (actionKey: string) => ActionConfig | undefined;
  getActionUnlockState: (actionKey: string) => ActionUnlockState;
  canAffordAction: (actionKey: string) => boolean;
  isActionPurchaseAllowed: (actionKey: string) => boolean;
  trackEntry: () => void;
}

/**
 * Purchase availability requires ALL of these:
 * 1. Global monetization enabled
 * 2. Global guru enabled
 * 3. Global guru purchase enabled
 * 4. Module rule guruPurchaseEnabled
 * 5. Config loaded (fail-safe: false if config missing)
 */
function computePurchaseAvailable(
  config: { enabled: boolean; guruEnabled: boolean; guruPurchaseEnabled: boolean } | null,
  rule: ModuleRule | undefined,
): boolean {
  if (!config) return false;
  if (!config.enabled) return false;
  if (!config.guruEnabled) return false;
  if (!config.guruPurchaseEnabled) return false;
  if (!rule?.enabled) return false;
  if (!rule.guruPurchaseEnabled) return false;
  return true;
}

export function useModuleMonetization(moduleKey: string): ModuleMonetizationResult {
  const config = useMonetizationStore((s) => s.config);
  const loading = useMonetizationStore((s) => s.loading);
  const exposureState = useMonetizationStore((s) => s.exposureState);
  const getModuleRule = useMonetizationStore((s) => s.getModuleRule);
  const getAction = useMonetizationStore((s) => s.getAction);
  const isAdsEnabledForModule = useMonetizationStore((s) => s.isAdsEnabledForModule);
  const isGuruEnabledForModule = useMonetizationStore((s) => s.isGuruEnabledForModule);
  const shouldShowAdOffer = useMonetizationStore((s) => s.shouldShowAdOffer);
  const trackModuleEntry = useMonetizationStore((s) => s.trackModuleEntry);
  const getExposureState = useMonetizationStore((s) => s.getExposureState);

  const walletBalance = useGuruWalletStore((s) => s.getBalance());
  const { snapshot } = useEntitlements();
  const { paywall } = usePaywall();

  const rule = useMemo(() => getModuleRule(moduleKey), [config, moduleKey, getModuleRule]);
  const adsEnabled = useMemo(() => isAdsEnabledForModule(moduleKey), [config, moduleKey, isAdsEnabledForModule]);
  const guruEnabled = useMemo(() => isGuruEnabledForModule(moduleKey), [config, moduleKey, isGuruEnabledForModule]);
  const shouldShowAd = useMemo(() => shouldShowAdOffer(moduleKey), [config, exposureState, moduleKey, shouldShowAdOffer]);
  const configLoaded = config !== null;
  const premiumActive = snapshot?.premiumActive ?? paywall?.premiumActive ?? false;
  const trialing = snapshot?.trialing ?? paywall?.trialing ?? false;
  const entitlementStatus = (snapshot?.status ?? paywall?.entitlementStatus ?? 'NONE') as EntitlementStatus;
  const premiumBehavior = (rule?.premiumBehavior ?? 'NO_CHANGE') as PremiumBehavior;
  const premiumAccessActive = premiumActive || trialing;
  const premiumCanUnlock = Boolean(
    premiumActive
    && (!trialing || rule?.trialUnlockEnabled),
  );
  const premiumApplied = premiumCanUnlock && premiumBehavior !== 'NO_CHANGE';
  const tokenPurchaseAvailable = Boolean(
    paywall?.tokenPurchaseEnabled
    || config?.guruPurchaseEnabled,
  );
  const adsSuppressedByPremium = Boolean(
    premiumAccessActive
    && (
      premiumBehavior === 'AD_FREE_ONLY'
      || rule?.premiumAdFree
      || paywall?.hideAdsForPremiumUsers
    ),
  );

  const isPurchaseAvailable = useMemo(
    () => computePurchaseAvailable(config, rule) || Boolean(paywall?.tokenPurchaseEnabled && rule?.guruPurchaseEnabled),
    [config, paywall?.tokenPurchaseEnabled, rule],
  );

  const adBlockReason = useMemo(
    () => {
      if (Platform.OS === 'web') {
        if (!configLoaded) return 'config_not_loaded';
        if (!config?.enabled || !config?.adsEnabled) return 'ads_disabled_globally';
        if (!adsEnabled) return 'ads_disabled_for_module';
        return null;
      }

      return getAdBlockReason({
        configLoaded,
        adsEnabledGlobal: Boolean(config?.enabled && config?.adsEnabled),
        adsEnabledForModule: adsEnabled,
        sdkAvailable: isAdMobAvailable(),
      });
    },
    [configLoaded, config, adsEnabled],
  );
  const isAdReady = adBlockReason === null;

  const getActionForModule = useCallback(
    (actionKey: string) => getAction(actionKey, moduleKey),
    [getAction, moduleKey],
  );

  const canAffordAction = useCallback(
    (actionKey: string) => {
      const action = getAction(actionKey, moduleKey);
      if (!action) return false;
      const effectiveCost = premiumCanUnlock && premiumBehavior === 'DISCOUNT_TOKEN_COST'
        ? Math.max(0, rule?.premiumTokenCost ?? action.guruCost)
        : action.guruCost;
      return walletBalance >= effectiveCost;
    },
    [getAction, moduleKey, premiumBehavior, premiumCanUnlock, rule?.premiumTokenCost, walletBalance],
  );

  /** Check action-level purchase flag in addition to module/global checks */
  const isActionPurchaseAllowed = useCallback(
    (actionKey: string) => {
      if (!isPurchaseAvailable) return false;
      const action = getAction(actionKey, moduleKey);
      if (!action) return false;
      return action.purchaseRequired
        || action.unlockType === 'AD_OR_GURU'
        || action.unlockType === 'GURU_SPEND'
        || action.unlockType === 'PURCHASE_ONLY';
    },
    [isPurchaseAvailable, getAction, moduleKey],
  );

  const getActionUnlockState = useCallback(
    (actionKey: string): ActionUnlockState => {
      const action = getAction(actionKey, moduleKey);
      const bypassMonetizationForWeb = Boolean(
        action
        && Platform.OS === 'web'
        && config?.enabled
        && config.webAdsEnabled === false,
      );
      const effectiveGuruCost = action
        ? premiumCanUnlock && premiumBehavior === 'DISCOUNT_TOKEN_COST'
          ? Math.max(0, rule?.premiumTokenCost ?? action.guruCost)
          : action.guruCost
        : 0;
      const premiumFreeUnlock = Boolean(
        action
        && premiumCanUnlock
        && (
          premiumBehavior === 'UNLOCK_FREE'
          || (premiumBehavior === 'DISCOUNT_TOKEN_COST' && effectiveGuruCost === 0)
        ),
      );
      const unlockType = bypassMonetizationForWeb || premiumFreeUnlock ? 'FREE' : (action?.unlockType ?? null);
      const isFree = unlockType === 'FREE';
      const supportsGuru = unlockType === 'GURU_SPEND' || unlockType === 'AD_OR_GURU';
      const guruEnabledForAction = Boolean(action && supportsGuru && guruEnabled);
      const supportsAd = unlockType === 'AD_WATCH'
        || unlockType === 'AD_OR_GURU'
        || (unlockType === 'GURU_SPEND' && Boolean(action?.rewardFallbackEnabled));
      const supportsPurchase = Boolean(
        action
        && (
          action.purchaseRequired
          || action.unlockType === 'AD_OR_GURU'
          || action.unlockType === 'GURU_SPEND'
          || action.unlockType === 'PURCHASE_ONLY'
        ),
      );
      const adEnabledForAction = Boolean(
        action
        && supportsAd
        && adsEnabled
        && rule?.rewardedAdEnabled !== false
        && !adsSuppressedByPremium,
      );
      const purchaseEnabledForAction = Boolean(
        action
        && supportsPurchase
        && isPurchaseAvailable
        && (unlockType === 'PURCHASE_ONLY' || guruEnabledForAction),
      );
      const hasAnyUnlockOption = Boolean(
        isFree
        || adEnabledForAction
        || guruEnabledForAction
        || purchaseEnabledForAction
      );
      const canAffordGuru = Boolean(action && walletBalance >= action.guruCost);
      const canAffordEffectiveGuru = Boolean(action && walletBalance >= effectiveGuruCost);
      const rewardAmount = action?.rewardAmount && action.rewardAmount > 0
        ? action.rewardAmount
        : (rule?.guruRewardAmountPerCompletedAd ?? 0);
      const resolvedGuruCost = bypassMonetizationForWeb ? 0 : (action?.guruCost ?? 0);
      const premiumAdjustedGuruCost = bypassMonetizationForWeb ? 0 : effectiveGuruCost;
      const resolvedRewardAmount = bypassMonetizationForWeb ? 0 : rewardAmount;

      return {
        action,
        unlockType,
        isFree,
        // An action can remain configured as monetized while module-level rules disable
        // every unlock path. In that case the feature should behave as freely accessible.
        usesMonetization: Boolean(action && !isFree && hasAnyUnlockOption),
        adEnabled: adEnabledForAction,
        shouldShowAdOffer: adEnabledForAction && shouldShowAd,
        adReady: adEnabledForAction && isAdReady,
        guruEnabled: guruEnabledForAction,
        canAffordGuru: canAffordEffectiveGuru,
        purchaseEnabled: purchaseEnabledForAction,
        hasAnyUnlockOption,
        requiresAdThenGuruSpend: Boolean(
          action
          && guruEnabledForAction
          && premiumAdjustedGuruCost > 0
          && (
            unlockType === 'AD_OR_GURU'
            || (unlockType === 'GURU_SPEND' && action.rewardFallbackEnabled)
          )
        ),
        guruCost: premiumAdjustedGuruCost || resolvedGuruCost,
        rewardAmount: resolvedRewardAmount,
      };
    },
    [
      getAction,
      moduleKey,
      adsEnabled,
      guruEnabled,
      isPurchaseAvailable,
      walletBalance,
      shouldShowAd,
      isAdReady,
      rule,
      config,
      adsSuppressedByPremium,
      premiumBehavior,
      premiumCanUnlock,
    ],
  );

  const trackEntry = useCallback(() => {
    trackModuleEntry(moduleKey);
    // Read exposure AFTER store update; Zustand set is synchronous so entryCount is already incremented
    const exposure = getExposureState(moduleKey);
    MonetizationEvents.moduleEntryTracked(moduleKey, exposure.entryCount);
  }, [trackModuleEntry, getExposureState, moduleKey]);

  return {
    isLoading: loading,
    configLoaded,
    rule,
    adsEnabled,
    guruEnabled,
    shouldShowAd,
    isAdReady,
    adBlockReason,
    walletBalance,
    isPurchaseAvailable,
    premiumActive,
    trialing,
    entitlementStatus,
    premiumBehavior,
    premiumApplied,
    premiumCanUnlock,
    tokenPurchaseAvailable,
    rewardedAdAvailable: adsEnabled && isAdReady && !adsSuppressedByPremium,
    getAction: getActionForModule,
    getActionUnlockState,
    canAffordAction,
    isActionPurchaseAllowed,
    trackEntry,
  };
}
