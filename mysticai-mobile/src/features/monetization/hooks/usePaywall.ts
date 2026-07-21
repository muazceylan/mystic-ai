import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuthStore } from '../../../store/useAuthStore';
import { fetchPaywall } from '../api/monetization.service';
import { resolveRevenueCatProduct, getRevenueCatOfferings } from '../services/revenueCatService';
import { useMonetizationStore } from '../store/useMonetizationStore';

export function usePaywall() {
  const userId = useAuthStore((state) => state.user?.id);
  const cachedPaywall = useMonetizationStore((state) => state.paywall);
  const revenueCatState = useMonetizationStore((state) => state.revenueCat);
  const setPaywall = useMonetizationStore((state) => state.setPaywall);

  const paywallQuery = useQuery({
    queryKey: queryKeys.monetizationPaywall(userId),
    queryFn: fetchPaywall,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (paywallQuery.data) {
      setPaywall(paywallQuery.data);
    }
  }, [paywallQuery.data, setPaywall]);

  const paywall = paywallQuery.data ?? cachedPaywall ?? null;

  const offeringsQuery = useQuery({
    queryKey: queryKeys.monetizationOfferings(userId),
    queryFn: getRevenueCatOfferings,
    enabled: Boolean(
      paywall?.revenueCatEnabled
      && revenueCatState.supported
      && revenueCatState.ready,
    ),
    staleTime: 30_000,
  });

  const subscriptionProducts = useMemo(
    () => (paywall?.subscriptionProducts ?? []).map((product) =>
      resolveRevenueCatProduct(product, offeringsQuery.data?.defaultOffering ?? null))
      .filter((product) => product.availableForPurchase),
    [offeringsQuery.data?.defaultOffering, paywall?.subscriptionProducts],
  );

  const tokenProducts = useMemo(
    () => (paywall?.tokenProducts ?? []).map((product) =>
      resolveRevenueCatProduct(product, offeringsQuery.data?.tokenOffering ?? null))
      .filter((product) => product.availableForPurchase),
    [offeringsQuery.data?.tokenOffering, paywall?.tokenProducts],
  );

  const revenueCatDisabledReason = useMemo(() => {
    if (!paywall?.revenueCatEnabled) {
      return 'backend_disabled';
    }

    if (revenueCatState.disabledReason) {
      return revenueCatState.disabledReason;
    }

    if (!revenueCatState.ready) {
      return 'not_initialized';
    }

    // Don't flag as unavailable while still fetching — avoids a brief error flash
    if (offeringsQuery.isLoading) {
      return null;
    }

    if (!offeringsQuery.data?.defaultOffering) {
      return 'offerings_unavailable';
    }

    return null;
  }, [offeringsQuery.data?.defaultOffering, offeringsQuery.isLoading, paywall?.revenueCatEnabled, revenueCatState]);

  useEffect(() => {
    if (revenueCatDisabledReason) {
      console.info('[Monetization] Purchases unavailable', {
        reason: revenueCatDisabledReason,
        revenueCatEnabled: paywall?.revenueCatEnabled ?? null,
        paywallSource: paywallQuery.data ? 'network' : cachedPaywall ? 'cache' : 'none',
      });
    }
  }, [revenueCatDisabledReason, paywall?.revenueCatEnabled, paywallQuery.data, cachedPaywall]);

  return {
    ...paywallQuery,
    paywall,
    subscriptionProducts,
    tokenProducts,
    offerings: offeringsQuery.data?.offerings ?? null,
    currentOffering: offeringsQuery.data?.currentOffering ?? null,
    defaultOffering: offeringsQuery.data?.defaultOffering ?? null,
    tokenOffering: offeringsQuery.data?.tokenOffering ?? null,
    offeringsLoading: offeringsQuery.isLoading,
    offeringsError: offeringsQuery.error,
    revenueCatState,
    revenueCatDisabledReason,
    canPurchasePremium: Boolean(
      paywall?.premiumEnabled
      && paywall?.revenueCatEnabled
      && revenueCatState.ready
      && offeringsQuery.data?.defaultOffering
      && subscriptionProducts.length > 0,
    ),
    canPurchaseTokens: Boolean(
      paywall?.tokenPurchaseEnabled
      && paywall?.revenueCatEnabled
      && revenueCatState.ready
      && offeringsQuery.data?.tokenOffering
      && tokenProducts.length > 0,
    ),
    refresh: async () => {
      await Promise.all([paywallQuery.refetch(), offeringsQuery.refetch()]);
    },
  };
}
