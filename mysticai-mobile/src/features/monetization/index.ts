// Types
export type {
  MonetizationConfig,
  ModuleRule,
  ActionConfig,
  ActionUnlockState,
  GuruProduct,
  GuruWallet,
  GuruLedgerEntry,
  EligibilityResult,
  AdExposureState,
  PremiumBehavior,
  EntitlementStatus,
  EntitlementSnapshot,
  PaywallProduct,
  PaywallResponse,
} from './types';

// Stores
export { useMonetizationStore } from './store/useMonetizationStore';
export { useGuruWalletStore } from './store/useGuruWalletStore';

// Hooks
export { useModuleMonetization } from './hooks/useModuleMonetization';
export { useRewardedUnlock } from './hooks/useRewardedUnlock';
export { useGuruUnlock } from './hooks/useGuruUnlock';
export { useEntitlements } from './hooks/useEntitlements';
export { usePaywall } from './hooks/usePaywall';
export { usePurchasePremium } from './hooks/usePurchasePremium';
export { usePurchaseTokenPack } from './hooks/usePurchaseTokenPack';
export { useRestorePurchases } from './hooks/useRestorePurchases';

// Services
export {
  fetchMonetizationConfig,
  fetchWallet,
  fetchWalletBalance,
  fetchLedger,
  checkEligibility,
  clearMonetizationCache,
  fetchPaywall,
  fetchEntitlements,
  syncRevenueCatBilling,
  restoreBilling,
} from './api/monetization.service';

// Providers
export { getAdProvider, setAdProvider } from './providers/AdProviderAdapter';
export type { AdProviderAdapter, AdResult } from './providers/AdProviderAdapter';
export { AdMobRewardedProvider } from './providers/AdMobRewardedProvider';
export { initializeAdProvider } from './providers/initProvider';
export { resolveRewardedUnitId, getAdBlockReason } from './providers/admobUnitIds';
export { initializeAdMob, isAdMobInitialized, isAdMobAvailable } from './providers/admobInit';
export { RevenueCatProvider } from './providers/RevenueCatProvider';

// Components
export { GuruBalanceBadge } from './components/GuruBalanceBadge';
export { AdOfferCard } from './components/AdOfferCard';
export { ActionUnlockSheet } from './components/ActionUnlockSheet';
export { GuruUnlockModal } from './components/GuruUnlockModal';
export { FEATURE_ACTION_KEYS, FEATURE_MODULE_KEYS } from './featureKeys';
export { PurchaseCatalogSheet } from './components/PurchaseCatalogSheet';
export { MonetizationQuickBar } from './components/MonetizationQuickBar';

// Analytics
export { trackMonetizationEvent, MonetizationEvents } from './analytics/monetizationAnalytics';
