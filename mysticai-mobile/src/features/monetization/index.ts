// Types
export type {
  MonetizationConfig,
  ModuleRule,
  ActionConfig,
  GuruProduct,
  GuruWallet,
  GuruLedgerEntry,
  EligibilityResult,
  AdExposureState,
} from './types';

// Stores
export { useMonetizationStore } from './store/useMonetizationStore';
export { useGuruWalletStore } from './store/useGuruWalletStore';

// Hooks
export { useModuleMonetization } from './hooks/useModuleMonetization';
export { useRewardedUnlock } from './hooks/useRewardedUnlock';
export { useGuruUnlock } from './hooks/useGuruUnlock';

// Services
export {
  fetchMonetizationConfig,
  fetchWallet,
  fetchWalletBalance,
  fetchLedger,
  checkEligibility,
  clearMonetizationCache,
} from './api/monetization.service';

// Providers
export { getAdProvider, setAdProvider } from './providers/AdProviderAdapter';
export type { AdProviderAdapter, AdResult } from './providers/AdProviderAdapter';
export { AdMobRewardedProvider } from './providers/AdMobRewardedProvider';
export { initializeAdProvider } from './providers/initProvider';
export { resolveRewardedUnitId, getAdBlockReason } from './providers/admobUnitIds';
export { initializeAdMob, isAdMobInitialized, isAdMobAvailable } from './providers/admobInit';

// Components
export { GuruBalanceBadge } from './components/GuruBalanceBadge';
export { AdOfferCard } from './components/AdOfferCard';
export { GuruUnlockModal } from './components/GuruUnlockModal';
export { PurchaseCatalogSheet } from './components/PurchaseCatalogSheet';

// Analytics
export { trackMonetizationEvent, MonetizationEvents } from './analytics/monetizationAnalytics';
