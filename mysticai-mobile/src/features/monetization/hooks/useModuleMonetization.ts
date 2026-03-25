import { useCallback, useMemo } from 'react';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { getAdBlockReason } from '../providers/admobUnitIds';
import { isAdMobAvailable } from '../providers/admobInit';
import type { ModuleRule, ActionConfig } from '../types';

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
  getAction: (actionKey: string) => ActionConfig | undefined;
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

  const rule = useMemo(() => getModuleRule(moduleKey), [config, moduleKey, getModuleRule]);
  const adsEnabled = useMemo(() => isAdsEnabledForModule(moduleKey), [config, moduleKey, isAdsEnabledForModule]);
  const guruEnabled = useMemo(() => isGuruEnabledForModule(moduleKey), [config, moduleKey, isGuruEnabledForModule]);
  const shouldShowAd = useMemo(() => shouldShowAdOffer(moduleKey), [config, exposureState, moduleKey, shouldShowAdOffer]);
  const configLoaded = config !== null;

  const isPurchaseAvailable = useMemo(
    () => computePurchaseAvailable(config, rule),
    [config, rule],
  );

  const adBlockReason = useMemo(
    () =>
      getAdBlockReason({
        configLoaded,
        adsEnabledGlobal: Boolean(config?.enabled && config?.adsEnabled),
        adsEnabledForModule: adsEnabled,
        sdkAvailable: isAdMobAvailable(),
      }),
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
      return walletBalance >= action.guruCost;
    },
    [getAction, moduleKey, walletBalance],
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
    getAction: getActionForModule,
    canAffordAction,
    isActionPurchaseAllowed,
    trackEntry,
  };
}
