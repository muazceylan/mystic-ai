import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { fetchEntitlements, fetchPaywall } from '../api/monetization.service';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { useMonetizationStore } from '../store/useMonetizationStore';

export async function refreshMonetizationState(
  queryClient: QueryClient,
  userId?: number | string | null,
) {
  const [entitlementsResult, paywallResult] = await Promise.allSettled([
    fetchEntitlements(),
    fetchPaywall(),
  ]);

  const entitlements = entitlementsResult.status === 'fulfilled' ? entitlementsResult.value : null;
  const paywall = paywallResult.status === 'fulfilled' ? paywallResult.value : null;

  if (entitlements) {
    useMonetizationStore.getState().setEntitlements(entitlements);
    queryClient.setQueryData(queryKeys.monetizationEntitlements(userId), entitlements);

    if (typeof entitlements.tokenBalance === 'number') {
      useGuruWalletStore.getState().setBalance(entitlements.tokenBalance);
    }
  }

  if (paywall) {
    useMonetizationStore.getState().setPaywall(paywall);
    queryClient.setQueryData(queryKeys.monetizationPaywall(userId), paywall);
  }

  return { entitlements, paywall };
}
