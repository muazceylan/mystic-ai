import type { CustomerInfo } from 'react-native-purchases';
import type { SubscriptionSnapshot } from '../types/billing';

export type PremiumPlanKey = 'monthly' | 'yearly' | 'premium';

export function createLoadingSubscriptionSnapshot(appUserId?: string | null): SubscriptionSnapshot {
  return {
    status: 'loading',
    isPremium: false,
    isTrialing: false,
    appUserId: appUserId ?? null,
    error: null,
  };
}

export function createUnavailableSubscriptionSnapshot(error?: string | null): SubscriptionSnapshot {
  return {
    status: 'unavailable',
    isPremium: false,
    isTrialing: false,
    error: error ?? null,
  };
}

export function toSubscriptionSnapshot(
  customerInfo: CustomerInfo,
  entitlementId: string,
  appUserId?: string | null,
): SubscriptionSnapshot {
  const entitlement = customerInfo.entitlements.active?.[entitlementId];

  if (!entitlement) {
    return {
      status: 'free',
      isPremium: false,
      isTrialing: false,
      entitlementId,
      managementURL: customerInfo.managementURL ?? null,
      appUserId: appUserId ?? null,
      lastUpdatedAt: customerInfo.requestDate ?? new Date().toISOString(),
      error: null,
    };
  }

  return {
    status: 'premium',
    isPremium: true,
    isTrialing: entitlement.periodType?.toUpperCase() === 'TRIAL',
    entitlementId: entitlement.identifier,
    productId: entitlement.productIdentifier,
    expirationDate: entitlement.expirationDate,
    willRenew: entitlement.willRenew,
    managementURL: customerInfo.managementURL ?? null,
    periodType: entitlement.periodType ?? null,
    appUserId: appUserId ?? null,
    lastUpdatedAt: customerInfo.requestDate ?? new Date().toISOString(),
    error: null,
  };
}

export function resolvePremiumPlanKey(productId?: string | null): PremiumPlanKey {
  const normalized = productId?.trim().toLowerCase() ?? '';
  if (normalized.includes('year') || normalized.includes('annual')) {
    return 'yearly';
  }
  if (normalized.includes('month')) {
    return 'monthly';
  }
  return 'premium';
}
