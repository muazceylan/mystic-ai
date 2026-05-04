import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { envConfig } from '../../../config/env';
import type { PaywallProduct } from '../types';
import type {
  ResolvedPaywallProduct,
  RevenueCatOfferingSnapshot,
  RevenueCatRuntimeState,
  RevenueCatSyncPayload,
} from '../types/billing';

let configuredAppUserId: string | null = null;

function getPlatformRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return envConfig.revenueCat.iosApiKey || null;
  }

  if (Platform.OS === 'android') {
    return envConfig.revenueCat.androidApiKey || null;
  }

  return null;
}

export function getRevenueCatInitialState(): RevenueCatRuntimeState {
  if (Platform.OS === 'web') {
    return {
      supported: false,
      configured: false,
      ready: false,
      disabledReason: 'unsupported_platform',
    };
  }

  if (!getPlatformRevenueCatApiKey()) {
    return {
      supported: true,
      configured: false,
      ready: false,
      disabledReason: 'missing_api_key',
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

export async function configureRevenueCat(appUserId: string): Promise<void> {
  const apiKey = getPlatformRevenueCatApiKey();
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

export function toRevenueCatSyncPayload(customerInfo: CustomerInfo): RevenueCatSyncPayload {
  return {
    appUserId: getConfiguredRevenueCatUserId(),
    originalAppUserId: customerInfo.originalAppUserId,
    activeEntitlements: Object.keys(customerInfo.entitlements.active ?? {}),
    activeProductIds: customerInfo.activeSubscriptions ?? [],
    environment: envConfig.revenueCat.env,
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

export function resolveOfferingFromOfferings(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  return offerings?.current ?? null;
}

export function resolveRevenueCatProduct(
  product: PaywallProduct,
  offering: PurchasesOffering | null,
): ResolvedPaywallProduct {
  const availablePackages = offering?.availablePackages ?? [];
  const candidates = new Set(getCandidateProductIds(product));
  const matchedPackage = availablePackages.find((entry) => candidates.has(entry.product.identifier)) ?? null;

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
