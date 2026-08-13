import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { restoreBilling, syncRevenueCatBilling } from '../api/monetization.service';
import { refreshMonetizationState } from '../services/monetizationRefresh';
import {
  getRevenueCatCustomerInfo,
  getRevenueCatSdkConfigFromMonetizationConfig,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  restoreRevenueCatPurchases,
  toRevenueCatSyncPayload,
} from '../services/revenueCatService';
import { toSubscriptionSnapshot } from '../services/subscriptionSnapshot';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useEntitlements } from './useEntitlements';

export function useSubscription() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const revenueCat = useMonetizationStore((state) => state.revenueCat);
  const revenueCatSubscription = useMonetizationStore((state) => state.subscription);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const setSubscription = useMonetizationStore((state) => state.setSubscription);
  const backendEntitlements = useEntitlements();

  const resolved = useMemo(() => {
    if (revenueCatSubscription.status === 'premium' || revenueCatSubscription.status === 'free') {
      return {
        ...revenueCatSubscription,
        source: 'revenuecat' as const,
        isLoading: false,
      };
    }

    const backend = backendEntitlements.snapshot;
    if (backend && (revenueCatSubscription.status !== 'loading' || backend.premiumActive || backend.trialing)) {
      return {
        ...revenueCatSubscription,
        status: backend.premiumActive || backend.trialing ? 'premium' as const : 'free' as const,
        isPremium: backend.premiumActive || backend.trialing,
        isTrialing: backend.trialing,
        entitlementId: revenueCatSubscription.entitlementId ?? backend.entitlementKey ?? null,
        productId: revenueCatSubscription.productId ?? backend.productId ?? null,
        expirationDate: revenueCatSubscription.expirationDate ?? backend.currentPeriodEndAt ?? null,
        willRenew: revenueCatSubscription.willRenew ?? backend.autoRenewEnabled ?? null,
        source: 'backend' as const,
        isLoading: false,
      };
    }

    return {
      ...revenueCatSubscription,
      source: null,
      isLoading: Boolean(isAuthenticated && (revenueCatSubscription.status === 'loading' || backendEntitlements.isLoading)),
    };
  }, [backendEntitlements.isLoading, backendEntitlements.snapshot, isAuthenticated, revenueCatSubscription]);

  const refreshSubscription = useCallback(async () => {
    if (!userId) {
      return null;
    }

    if (!revenueCat.ready) {
      await backendEntitlements.refetch();
      return null;
    }

    const customerInfo = await getRevenueCatCustomerInfo();
    const next = toSubscriptionSnapshot(
      customerInfo,
      REVENUECAT_PREMIUM_ENTITLEMENT_ID,
      String(userId),
    );
    setSubscription(next);

    await Promise.allSettled([
      syncRevenueCatBilling(toRevenueCatSyncPayload(
        customerInfo,
        getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
      )),
    ]);
    await refreshMonetizationState(queryClient, userId);
    return next;
  }, [backendEntitlements, monetizationConfig, queryClient, revenueCat.ready, setSubscription, userId]);

  const restorePurchases = useCallback(async () => {
    if (!userId || !revenueCat.ready) {
      return { status: 'failed' as const };
    }

    const customerInfo = await restoreRevenueCatPurchases();
    const next = toSubscriptionSnapshot(
      customerInfo,
      REVENUECAT_PREMIUM_ENTITLEMENT_ID,
      String(userId),
    );
    setSubscription(next);
    await Promise.allSettled([
      restoreBilling(toRevenueCatSyncPayload(
        customerInfo,
        getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
      )),
    ]);
    await refreshMonetizationState(queryClient, userId);
    return { status: next.isPremium ? 'success' as const : 'not_found' as const };
  }, [monetizationConfig, queryClient, revenueCat.ready, setSubscription, userId]);

  return {
    ...resolved,
    entitlementId: resolved.entitlementId ?? REVENUECAT_PREMIUM_ENTITLEMENT_ID,
    refreshSubscription,
    restorePurchases,
  };
}
