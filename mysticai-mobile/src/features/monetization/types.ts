export type PremiumBehavior =
  | 'NO_CHANGE'
  | 'UNLOCK_FREE'
  | 'DISCOUNT_TOKEN_COST'
  | 'AD_FREE_ONLY'
  | 'TOKEN_REQUIRED_EVEN_PREMIUM';

export type EntitlementStatus =
  | 'NONE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'BILLING_RETRY'
  | 'PAUSED'
  | 'CANCELLED_ACTIVE'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'REVOKED';

// Monetization config from server
export interface MonetizationConfig {
  enabled: boolean;
  adsEnabled: boolean;
  webAdsEnabled: boolean;
  guruEnabled: boolean;
  guruPurchaseEnabled: boolean;
  revenueCatEnabled?: boolean;
  revenueCatIosApiKey?: string | null;
  revenueCatAndroidApiKey?: string | null;
  revenueCatEnvironment?: string | null;
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
  rewardedAdEnabled?: boolean;
  rewardedAdViewsRequired?: number | null;
  rewardedAdHourlyLimit?: number;
  rewardedAdDailyLimit?: number;
  rewardedAdCooldownMinutes?: number;
  rewardedAdWindowMinutes?: number;
  allowFreePreview: boolean;
  previewDepthMode: string;
  premiumBehavior?: PremiumBehavior;
  premiumTokenCost?: number;
  premiumAdFree?: boolean;
  trialUnlockEnabled?: boolean;
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
  revenueCatProductId?: string;
  entitlementKey?: string | null;
  trialDurationDays?: number;
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
  premiumActive?: boolean;
  trialing?: boolean;
  entitlementStatus?: EntitlementStatus;
  premiumApplied?: boolean;
  premiumBehavior?: PremiumBehavior;
  discountedTokenCost?: number;
  chargedTokenAmount?: number;
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

export interface EntitlementSnapshot {
  premiumActive: boolean;
  trialing: boolean;
  status: EntitlementStatus;
  entitlementKey?: string | null;
  productId?: string | null;
  provider?: string | null;
  store?: string | null;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  currentPeriodStartAt?: string | null;
  currentPeriodEndAt?: string | null;
  autoRenewEnabled?: boolean;
  cancelledAt?: string | null;
  expiredAt?: string | null;
  lastEventAt?: string | null;
  entitlements: string[];
  tokenBalance?: number;
}

export interface PaywallProduct {
  productKey: string;
  productType?: string;
  iosProductId?: string | null;
  androidProductId?: string | null;
  revenueCatProductId?: string | null;
  title?: string;
  description?: string;
  entitlementKey?: string | null;
  tokenAmount?: number | null;
  bonusTokenAmount?: number | null;
  price?: string | null;
  currency?: string | null;
  trialDurationDays?: number | null;
  sortOrder?: number;
  badge?: string | null;
  popular?: boolean;
  campaignLabel?: string | null;
}

export interface PaywallResponse {
  premiumEnabled: boolean;
  trialEnabled: boolean;
  trialEligible: boolean;
  defaultTrialDays: number;
  tokenPurchaseEnabled: boolean;
  revenueCatEnabled: boolean;
  hideAdsForPremiumUsers: boolean;
  allowPremiumAndTokenTogether: boolean;
  premiumActive: boolean;
  trialing: boolean;
  entitlementStatus: EntitlementStatus;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  tokenBalance: number;
  subscriptionProducts: PaywallProduct[];
  tokenProducts: PaywallProduct[];
  benefits: string[];
  fetchedAt?: string;
}

export interface UnlockOptions {
  moduleKey: string;
  actionKey: string;
  tokenRequirement: number;
  userGuruBalance: number;
  tokenUnlockEnabled: boolean;
  rewardedAdEnabled: boolean;
  rewardedAdViewsRequired: number;
  rewardedAdProgress: {
    completed: number;
    required: number;
  };
  adAvailability: {
    allowed: boolean;
    reason?: string | null;
    retryAfterSeconds: number;
    message?: string | null;
  };
}

export interface TokenUnlockResponse {
  unlocked: boolean;
  reason?: string | null;
  message?: string | null;
  spentGuru: number;
  remainingGuru: number;
}

export interface RewardedAdCheckResponse {
  allowed: boolean;
  reason?: string | null;
  requiredViews: number;
  completedViews: number;
  remainingViews: number;
  retryAfterSeconds: number;
  message?: string | null;
}

export interface CompleteRewardedAdPayload {
  adNetwork: string;
  placement: string;
  transactionId?: string | null;
  clientEventId: string;
}

export interface RewardedAdCompleteResponse {
  completedViews: number;
  requiredViews: number;
  remainingViews: number;
  unlocked: boolean;
  unlockId?: string | null;
  message?: string | null;
  idempotentReplay?: boolean;
}
