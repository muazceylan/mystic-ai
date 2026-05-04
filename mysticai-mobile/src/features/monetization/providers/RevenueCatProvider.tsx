import { useEffect, useRef, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { queryClient } from '../../../lib/queryClient';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuthStore } from '../../../store/useAuthStore';
import { syncRevenueCatBilling } from '../api/monetization.service';
import {
  addRevenueCatCustomerInfoListener,
  configureRevenueCat,
  getRevenueCatAppUserId,
  getRevenueCatCustomerInfo,
  getRevenueCatInitialState,
  getRevenueCatSdkConfigFromMonetizationConfig,
  isRevenueCatSupportedPlatform,
  logoutRevenueCat,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { useMonetizationStore } from '../store/useMonetizationStore';

async function syncCustomerInfo(
  customerInfo: CustomerInfo,
  userId: string | number,
  runtimeConfig: Parameters<typeof toRevenueCatSyncPayload>[1],
): Promise<void> {
  const response = await syncRevenueCatBilling(toRevenueCatSyncPayload(customerInfo, runtimeConfig));
  useGuruWalletStore.getState().setBalance(response.tokenBalance);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.monetizationEntitlements(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.monetizationPaywall(userId) }),
  ]);
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const setRevenueCatState = useMonetizationStore((state) => state.setRevenueCatState);
  const resetBillingState = useMonetizationStore((state) => state.resetBillingState);
  const lastSyncedRequestDateRef = useRef<string | null>(null);
  const lastLoggedInUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isRevenueCatSupportedPlatform()) {
      setRevenueCatState(getRevenueCatInitialState());
      return;
    }

    const runtimeConfig = getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig);
    const initialRevenueCatState = getRevenueCatInitialState(runtimeConfig, {
      remoteConfigResolved: monetizationConfig !== null,
    });
    if (initialRevenueCatState.disabledReason === 'not_initialized') {
      setRevenueCatState(initialRevenueCatState);
      return;
    }
    if (initialRevenueCatState.disabledReason === 'missing_api_key') {
      setRevenueCatState(initialRevenueCatState);
      return;
    }

    const appUserId = getRevenueCatAppUserId(isAuthenticated ? userId : null);
    if (!appUserId) {
      if (lastLoggedInUserIdRef.current) {
        void logoutRevenueCat().catch(() => {});
        lastLoggedInUserIdRef.current = null;
      }

      resetBillingState();
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        await configureRevenueCat(appUserId, runtimeConfig);
        const customerInfo = await getRevenueCatCustomerInfo();
        if (cancelled) {
          return;
        }

        lastLoggedInUserIdRef.current = appUserId;
        lastSyncedRequestDateRef.current = customerInfo.requestDate ?? null;
        setRevenueCatState({
          supported: true,
          configured: true,
          ready: true,
          disabledReason: null,
          error: null,
          initializedAt: new Date().toISOString(),
          activeAppUserId: appUserId,
          lastCustomerInfoAt: customerInfo.requestDate ?? new Date().toISOString(),
        });

        await syncCustomerInfo(customerInfo, appUserId, runtimeConfig);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRevenueCatState({
          supported: true,
          configured: false,
          ready: false,
          disabledReason: 'sdk_error',
          error: toSafeRevenueCatErrorMessage(error),
          activeAppUserId: appUserId,
        });
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, monetizationConfig, resetBillingState, setRevenueCatState, userId]);

  useEffect(() => {
    const appUserId = getRevenueCatAppUserId(isAuthenticated ? userId : null);
    if (!isHydrated || !appUserId || !isRevenueCatSupportedPlatform()) {
      return;
    }

    const runtimeConfig = getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig);
    const removeListener = addRevenueCatCustomerInfoListener((customerInfo) => {
      const requestDate = customerInfo.requestDate ?? null;
      setRevenueCatState({
        lastCustomerInfoAt: requestDate ?? new Date().toISOString(),
      });

      if (requestDate && requestDate === lastSyncedRequestDateRef.current) {
        return;
      }

      lastSyncedRequestDateRef.current = requestDate;
      void syncCustomerInfo(customerInfo, appUserId, runtimeConfig).catch((error) => {
        setRevenueCatState({
          error: toSafeRevenueCatErrorMessage(error),
        });
      });
    });

    return removeListener;
  }, [isAuthenticated, isHydrated, monetizationConfig, setRevenueCatState, userId]);

  return <>{children}</>;
}
