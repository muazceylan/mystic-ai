import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { envConfig } from '../../../config/env';
import type { MonetizationConfig, PaywallProduct } from '../types';
import type {
  ResolvedPaywallProduct,
  RevenueCatOfferingSnapshot,
  RevenueCatSdkConfig,
  RevenueCatRuntimeState,
  RevenueCatSyncPayload,
} from '../types/billing';

let configuredAppUserId: string | null = null;

export const REVENUECAT_GOOGLE_API_KEY = envConfig.revenueCat.googleApiKey;
export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = envConfig.revenueCat.premiumEntitlementId;

const SUBSCRIPTION_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  premium_monthly: 'monthly',
  astroguru_premium_monthly: 'monthly',
  premium_yearly: 'annual',
  astroguru_premium_yearly: 'annual',
};

const TOKEN_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  token_50: 'token_50',
  guru_tokens_50: 'token_50',
  token_150: 'token_150',
  guru_tokens_150: 'token_150',
  token_500: 'token_500',
  guru_tokens_500: 'token_500',
  token_1200: 'token_1200',
  guru_tokens_1200: 'token_1200',
};

interface RevenueCatInitialStateOptions {
  remoteConfigResolved?: boolean;
}

function normalizeOptionalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRevenueCatEnvironment(value: string | null | undefined): string {
  const token = value?.trim().toLowerCase();
  return token === 'production' || token === 'prod' ? 'production' : 'sandbox';
}

function getEnvRevenueCatConfig(): RevenueCatSdkConfig {
  return {
    iosApiKey: envConfig.revenueCat.iosApiKey || null,
    androidApiKey: envConfig.revenueCat.androidApiKey || null,
    environment: envConfig.revenueCat.env,
  };
}

export function getRevenueCatSdkConfigFromMonetizationConfig(
  config: Pick<MonetizationConfig, 'revenueCatIosApiKey' | 'revenueCatAndroidApiKey' | 'revenueCatEnvironment'> | null | undefined,
): RevenueCatSdkConfig | null {
  if (!config) {
    return null;
  }

  return {
    iosApiKey: normalizeOptionalValue(config.revenueCatIosApiKey),
    androidApiKey: normalizeOptionalValue(config.revenueCatAndroidApiKey),
    environment: normalizeOptionalValue(config.revenueCatEnvironment),
  };
}

function getPlatformRevenueCatApiKey(runtimeConfig?: RevenueCatSdkConfig | null): string | null {
  const runtimeIosApiKey = normalizeOptionalValue(runtimeConfig?.iosApiKey);
  const runtimeAndroidApiKey = normalizeOptionalValue(runtimeConfig?.androidApiKey);
  const envApiKey = getEnvRevenueCatConfig();

  if (Platform.OS === 'ios') {
    return runtimeIosApiKey ?? normalizeOptionalValue(envApiKey.iosApiKey);
  }

  if (Platform.OS === 'android') {
    return runtimeAndroidApiKey ?? normalizeOptionalValue(envApiKey.androidApiKey);
  }

  return null;
}

export function getRevenueCatInitialState(
  runtimeConfig?: RevenueCatSdkConfig | null,
  options?: RevenueCatInitialStateOptions,
): RevenueCatRuntimeState {
  if (Platform.OS === 'web') {
    return {
      supported: false,
      configured: false,
      ready: false,
      disabledReason: 'unsupported_platform',
    };
  }

  if (!getPlatformRevenueCatApiKey(runtimeConfig)) {
    return {
      supported: true,
      configured: false,
      ready: false,
      disabledReason: options?.remoteConfigResolved ? 'missing_api_key' : 'not_initialized',
    };
  }

  return {
    supported: true,
    configured: false,
    ready: false,
    disabledReason: 'user_not_authenticated',
  };
}

export function isRevenueCatSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function getRevenueCatAppUserId(userId: string | number | null | undefined): string | null {
  if (typeof userId === 'number' && Number.isFinite(userId) && userId > 0) {
    return String(Math.trunc(userId));
  }

  if (typeof userId === 'string' && userId.trim()) {
    return userId.trim();
  }

  return null;
}

export function getConfiguredRevenueCatUserId(): string | null {
  return configuredAppUserId;
}

export function isRevenueCatPremiumActive(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active?.[REVENUECAT_PREMIUM_ENTITLEMENT_ID]);
}

export async function configureRevenueCat(
  appUserId: string,
  runtimeConfig?: RevenueCatSdkConfig | null,
): Promise<void> {
  const apiKey = getPlatformRevenueCatApiKey(runtimeConfig);
  if (!isRevenueCatSupportedPlatform()) {
    throw new Error('RevenueCat is only supported on native mobile builds.');
  }
  if (!apiKey) {
    throw new Error('RevenueCat API key is missing for this platform.');
  }

  if (!configuredAppUserId) {
    Purchases.configure({
      apiKey,
      appUserID: appUserId,
    });
    configuredAppUserId = appUserId;
    return;
  }

  if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!configuredAppUserId) {
    return;
  }

  try {
    await Purchases.logOut();
  } finally {
    configuredAppUserId = null;
  }
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getRevenueCatOfferings(): Promise<RevenueCatOfferingSnapshot> {
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;
  return {
    offerings,
    currentOffering,
    availablePackages: currentOffering?.availablePackages ?? [],
  };
}

export async function purchaseRevenueCatPackage(
  revenueCatPackage: PurchasesPackage,
): Promise<{ customerInfo: CustomerInfo; productIdentifier: string }> {
  const result = await Purchases.purchasePackage(revenueCatPackage);
  return {
    customerInfo: result.customerInfo,
    productIdentifier: result.productIdentifier,
  };
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function addRevenueCatCustomerInfoListener(
  listener: (customerInfo: CustomerInfo) => void,
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export function isRevenueCatPurchaseCancelled(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
  );
}

export function toRevenueCatSyncPayload(
  customerInfo: CustomerInfo,
  runtimeConfig?: RevenueCatSdkConfig | null,
): RevenueCatSyncPayload {
  return {
    appUserId: getConfiguredRevenueCatUserId(),
    originalAppUserId: customerInfo.originalAppUserId,
    activeEntitlements: Object.keys(customerInfo.entitlements.active ?? {}),
    activeProductIds: customerInfo.activeSubscriptions ?? [],
    environment: normalizeRevenueCatEnvironment(runtimeConfig?.environment ?? getEnvRevenueCatConfig().environment),
    fetchedAt: customerInfo.requestDate ?? new Date().toISOString(),
  };
}

function getCandidateProductIds(product: PaywallProduct): string[] {
  const ids = [
    product.revenueCatProductId,
    Platform.OS === 'ios' ? product.iosProductId : product.androidProductId,
    product.iosProductId,
    product.androidProductId,
  ];

  return ids.filter((value): value is string => Boolean(value && value.trim()));
}

function normalizeStoreProductId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.split(':', 1)[0] || trimmed;
}

function getCandidatePackageIds(product: PaywallProduct): string[] {
  const keys = [
    product.productKey,
    product.revenueCatProductId,
    Platform.OS === 'ios' ? product.iosProductId : product.androidProductId,
    product.iosProductId,
    product.androidProductId,
  ]
    .map(normalizeStoreProductId)
    .filter((value): value is string => Boolean(value));

  const packageIds = keys
    .map((key) => SUBSCRIPTION_PACKAGE_IDS_BY_PRODUCT_KEY[key] ?? TOKEN_PACKAGE_IDS_BY_PRODUCT_KEY[key])
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(packageIds));
}

function packageMatchesProductId(entry: PurchasesPackage, productId: string): boolean {
  return entry.product.identifier === productId
    || normalizeStoreProductId(entry.product.identifier) === normalizeStoreProductId(productId);
}

export function resolveOfferingFromOfferings(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  return offerings?.current ?? null;
}

export function resolveRevenueCatProduct(
  product: PaywallProduct,
  offering: PurchasesOffering | null,
): ResolvedPaywallProduct {
  const availablePackages = offering?.availablePackages ?? [];
  const candidates = new Set(getCandidateProductIds(product));
  const packageCandidates = new Set(getCandidatePackageIds(product));
  const matchedPackage = availablePackages.find((entry) => packageCandidates.has(entry.identifier))
    ?? availablePackages.find((entry) =>
      Array.from(candidates).some((candidate) => packageMatchesProductId(entry, candidate)))
    ?? null;

  return {
    ...product,
    offeringId: offering?.identifier ?? null,
    revenueCatPackage: matchedPackage,
    localizedPrice: matchedPackage?.product.priceString ?? product.price ?? null,
    localizedPeriodPrice: matchedPackage?.product.pricePerMonthString
      ?? matchedPackage?.product.pricePerYearString
      ?? matchedPackage?.product.priceString
      ?? product.price
      ?? null,
    storeProductId: matchedPackage?.product.identifier ?? null,
    availableForPurchase: Boolean(matchedPackage),
  };
}

export function toSafeRevenueCatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) {
      return message;
    }
  }

  return 'RevenueCat request failed';
}
