import { Platform } from 'react-native';
import Constants from 'expo-constants';
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
  RevenueCatDiagnostics,
  RevenueCatOfferingSnapshot,
  RevenueCatSdkConfig,
  RevenueCatRuntimeState,
  RevenueCatSyncPayload,
} from '../types/billing';

let configuredAppUserId: string | null = null;

export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = envConfig.revenueCat.premiumEntitlementId;
export const REVENUECAT_DEFAULT_OFFERING_ID = 'default';
export const REVENUECAT_TOKEN_OFFERING_ID = 'guru_tokens';

const SUBSCRIPTION_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  premium_monthly: '$rc_monthly',
  astroguru_premium_monthly: '$rc_monthly',
  premium_yearly: '$rc_annual',
  astroguru_premium_yearly: '$rc_annual',
};

const TOKEN_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  token_50: 'guru_tokens_50',
  guru_tokens_50: 'guru_tokens_50',
  token_150: 'guru_tokens_150',
  guru_tokens_150: 'guru_tokens_150',
  token_500: 'guru_tokens_500',
  guru_tokens_500: 'guru_tokens_500',
  token_1200: 'guru_tokens_1200',
  guru_tokens_1200: 'guru_tokens_1200',
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
    testApiKey: envConfig.revenueCat.testApiKey || null,
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
    testApiKey: envConfig.revenueCat.testApiKey || null,
    environment: normalizeOptionalValue(config.revenueCatEnvironment),
  };
}

function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === 'expo';
}

function isProductionBuild(): boolean {
  return envConfig.isProduction;
}

function getRevenueCatBuildProfile(): string | null {
  return normalizeOptionalValue(process.env.EAS_BUILD_PROFILE)
    ?? normalizeOptionalValue(process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE)
    ?? normalizeOptionalValue(process.env.EXPO_PUBLIC_BUILD_PROFILE);
}

function getRevenueCatApiKey(runtimeConfig?: RevenueCatSdkConfig | null): {
  key: string | null;
  source: RevenueCatDiagnostics['selectedKeySource'];
} {
  if (!isRevenueCatSupportedPlatform()) {
    return { key: null, source: 'unsupported' };
  }

  if (isExpoGoRuntime()) {
    return { key: null, source: 'expo_go' };
  }

  const envApiKey = getEnvRevenueCatConfig();
  const testKey = normalizeOptionalValue(runtimeConfig?.testApiKey) ?? normalizeOptionalValue(envApiKey.testApiKey);
  const androidKey = normalizeOptionalValue(envApiKey.androidApiKey);
  const iosKey = normalizeOptionalValue(envApiKey.iosApiKey);

  if (!isProductionBuild() && testKey) {
    return { key: testKey, source: 'test' };
  }

  if (Platform.OS === 'android' && androidKey) {
    return { key: androidKey, source: 'android' };
  }

  if (Platform.OS === 'ios' && iosKey) {
    return { key: iosKey, source: 'ios' };
  }

  if (testKey) {
    return { key: testKey, source: 'test-fallback' };
  }

  return { key: null, source: 'missing' };
}

export function getRevenueCatDiagnostics(
  runtimeConfig?: RevenueCatSdkConfig | null,
): RevenueCatRuntimeState['diagnostics'] {
  const envApiKey = getEnvRevenueCatConfig();
  const selected = getRevenueCatApiKey(runtimeConfig);
  return {
    platform: Platform.OS,
    appEnv: envConfig.appEnv,
    buildProfile: getRevenueCatBuildProfile(),
    hasAndroidKey: Boolean(normalizeOptionalValue(envApiKey.androidApiKey)),
    hasIosKey: Boolean(normalizeOptionalValue(envApiKey.iosApiKey)),
    hasTestKey: Boolean(normalizeOptionalValue(runtimeConfig?.testApiKey) ?? normalizeOptionalValue(envApiKey.testApiKey)),
    selectedKeySource: selected.source,
    entitlementId: REVENUECAT_PREMIUM_ENTITLEMENT_ID,
    offeringId: REVENUECAT_DEFAULT_OFFERING_ID,
    tokenOfferingId: REVENUECAT_TOKEN_OFFERING_ID,
  };
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
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  if (isExpoGoRuntime()) {
    return {
      supported: false,
      configured: false,
      ready: false,
      disabledReason: 'expo_go',
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  if (!getRevenueCatApiKey(runtimeConfig).key) {
    return {
      supported: true,
      configured: false,
      ready: false,
      disabledReason: options?.remoteConfigResolved ? 'missing_api_key' : 'not_initialized',
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  return {
    supported: true,
    configured: false,
    ready: false,
    disabledReason: 'user_not_authenticated',
    diagnostics: getRevenueCatDiagnostics(runtimeConfig),
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
  const { key: apiKey } = getRevenueCatApiKey(runtimeConfig);
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
  const defaultOffering = offerings.current ?? offerings.all?.[REVENUECAT_DEFAULT_OFFERING_ID] ?? null;
  const tokenOffering = offerings.all?.[REVENUECAT_TOKEN_OFFERING_ID] ?? null;
  return {
    offerings,
    currentOffering: defaultOffering,
    defaultOffering,
    tokenOffering,
    availablePackages: defaultOffering?.availablePackages ?? [],
    tokenPackages: tokenOffering?.availablePackages ?? [],
  };
}

export async function purchaseRevenueCatPackage(
  revenueCatPackage: PurchasesPackage,
): Promise<{
  customerInfo: CustomerInfo;
  productIdentifier: string;
  transactionIdentifier: string | null;
  purchaseToken: string | null;
}> {
  const result = await Purchases.purchasePackage(revenueCatPackage);
  return {
    customerInfo: result.customerInfo,
    productIdentifier: result.productIdentifier,
    transactionIdentifier: result.transaction?.transactionIdentifier ?? null,
    purchaseToken: result.transaction?.purchaseToken ?? null,
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
  purchase?: {
    productIdentifier?: string | null;
    transactionIdentifier?: string | null;
    purchaseToken?: string | null;
  },
): RevenueCatSyncPayload {
  const storeTransactionId = purchase?.transactionIdentifier ?? purchase?.purchaseToken ?? null;
  const purchasedProductId = purchase?.productIdentifier ?? null;
  return {
    appUserId: getConfiguredRevenueCatUserId(),
    originalAppUserId: customerInfo.originalAppUserId,
    activeEntitlements: Object.keys(customerInfo.entitlements.active ?? {}),
    activeProductIds: customerInfo.activeSubscriptions ?? [],
    environment: normalizeRevenueCatEnvironment(runtimeConfig?.environment ?? getEnvRevenueCatConfig().environment),
    fetchedAt: customerInfo.requestDate ?? new Date().toISOString(),
    purchaseIdempotencyKey: storeTransactionId || purchasedProductId
      ? `revenuecat:${storeTransactionId ?? 'no-transaction'}:${purchasedProductId ?? 'no-product'}`
      : null,
    purchasedProductId,
    storeTransactionId,
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
  const entryId = entry.product.identifier;
  const normalizedEntry = normalizeStoreProductId(entryId);
  const normalizedProduct = normalizeStoreProductId(productId);
  return entryId === productId
    || normalizedEntry === normalizedProduct
    || Boolean(normalizedEntry && normalizedProduct && normalizedEntry.startsWith(normalizedProduct))
    || Boolean(normalizedEntry && normalizedProduct && normalizedProduct.startsWith(normalizedEntry));
}

export function resolveOfferingFromOfferings(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  return offerings?.current ?? offerings?.all?.[REVENUECAT_DEFAULT_OFFERING_ID] ?? null;
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
