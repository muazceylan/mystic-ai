import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuthStore } from '../../../store/useAuthStore';
import { fetchEntitlements } from '../api/monetization.service';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import type { EntitlementSnapshot } from '../types';

export function useEntitlements() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const setEntitlements = useMonetizationStore((state) => state.setEntitlements);
  const cachedEntitlements = useMonetizationStore((state) => state.entitlements);
  const setBalance = useGuruWalletStore((state) => state.setBalance);

  const query = useQuery({
    queryKey: queryKeys.monetizationEntitlements(userId),
    queryFn: fetchEntitlements,
    enabled: Boolean(isAuthenticated && userId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    setEntitlements(query.data);
    if (typeof query.data.tokenBalance === 'number') {
      setBalance(query.data.tokenBalance);
    }
  }, [query.data, setBalance, setEntitlements]);

  const snapshot = useMemo<EntitlementSnapshot | null>(() => {
    return query.data ?? cachedEntitlements ?? null;
  }, [cachedEntitlements, query.data]);

  return {
    ...query,
    snapshot,
    premiumActive: snapshot?.premiumActive ?? false,
    trialing: snapshot?.trialing ?? false,
    status: snapshot?.status ?? 'NONE',
    tokenBalance: snapshot?.tokenBalance,
    refresh: query.refetch,
  };
}
