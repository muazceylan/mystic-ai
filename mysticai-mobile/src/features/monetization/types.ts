// Monetization config from server
export interface MonetizationConfig {
  enabled: boolean;
  adsEnabled: boolean;
  webAdsEnabled: boolean;
  guruEnabled: boolean;
  guruPurchaseEnabled: boolean;
  defaultAdProvider: string;
  globalDailyAdCap: number;
  globalWeeklyAdCap: number;
  globalMinHoursBetweenOffers: number;
  globalMinSessionsBetweenOffers: number;
  configVersion: number;
  moduleRules: ModuleRule[];
  actions: ActionConfig[];
  products: GuruProduct[];
  walletBalance: number;
  fetchedAt: string;
}

export interface ModuleRule {
  moduleKey: string;
  enabled: boolean;
  adsEnabled: boolean;
  guruEnabled: boolean;
  guruPurchaseEnabled: boolean;
  adStrategy: string;
  adProvider: string;
  adFormats: string;
  firstNEntriesWithoutAd: number;
  adOfferStartEntry: number;
  adOfferFrequencyMode: string;
  minimumSessionsBetweenOffers: number;
  minimumHoursBetweenOffers: number;
  dailyOfferCap: number;
  weeklyOfferCap: number;
  onlyUserTriggeredOffer: boolean;
  showOfferOnDetailClick: boolean;
  showOfferOnSecondEntry: boolean;
  guruRewardAmountPerCompletedAd: number;
  allowFreePreview: boolean;
  previewDepthMode: string;
  rolloutStatus: string;
}

export interface ActionConfig {
  actionKey: string;
  moduleKey: string;
  displayName?: string;
  description?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  analyticsKey?: string;
  unlockType: UnlockType;
  guruCost: number;
  rewardAmount: number;
  rewardFallbackEnabled: boolean;
  adRequired: boolean;
  purchaseRequired: boolean;
  previewAllowed: boolean;
  displayPriority: number;
  dailyLimit: number;
  weeklyLimit: number;
  updatedByAdminId?: number;
  updatedAt?: string;
}

export type UnlockType = 'FREE' | 'AD_WATCH' | 'GURU_SPEND' | 'AD_OR_GURU' | 'PURCHASE_ONLY';

export interface ActionUnlockState {
  action?: ActionConfig;
  unlockType: UnlockType | null;
  isFree: boolean;
  usesMonetization: boolean;
  adEnabled: boolean;
  shouldShowAdOffer: boolean;
  adReady: boolean;
  guruEnabled: boolean;
  canAffordGuru: boolean;
  purchaseEnabled: boolean;
  hasAnyUnlockOption: boolean;
  requiresAdThenGuruSpend: boolean;
  guruCost: number;
  rewardAmount: number;
}

export interface GuruProduct {
  productKey: string;
  productType: string;
  title: string;
  description?: string;
  guruAmount: number;
  bonusGuruAmount: number;
  price?: string;
  currency: string;
  iosProductId?: string;
  androidProductId?: string;
  sortOrder: number;
  badge?: string;
  campaignLabel?: string;
}

export interface GuruWallet {
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimePurchased: number;
  lastEarnedAt?: string;
  lastSpentAt?: string;
}

export interface GuruLedgerEntry {
  id: string;
  transactionType: string;
  sourceType: string;
  sourceKey?: string;
  moduleKey?: string;
  actionKey?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface EligibilityResult {
  monetizationActive: boolean;
  adOfferEligible: boolean;
  guruUnlockAvailable: boolean;
  purchaseFallbackAvailable: boolean;
  reason?: string;
  walletBalance: number;
  requiredGuruCost: number;
}

export interface AdExposureState {
  moduleKey: string;
  entryCount: number;
  dailyOfferCount: number;
  weeklyOfferCount: number;
  lastOfferAt?: number; // timestamp
  lastCompletedAdAt?: number; // timestamp
  sessionCount: number;
}
