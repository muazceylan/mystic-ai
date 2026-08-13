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
  getRevenueCatDiagnostics,
  getRevenueCatCustomerInfo,
  getRevenueCatInitialState,
  getRevenueCatSdkConfigFromMonetizationConfig,
  isRevenueCatSupportedPlatform,
  logoutRevenueCat,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import {
  createLoadingSubscriptionSnapshot,
  createUnavailableSubscriptionSnapshot,
  toSubscriptionSnapshot,
} from '../services/subscriptionSnapshot';
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
  const setSubscription = useMonetizationStore((state) => state.setSubscription);
  const revenueCatReady = useMonetizationStore((state) => state.revenueCat.ready);
  const resetBillingState = useMonetizationStore((state) => state.resetBillingState);
  const lastSyncedRequestDateRef = useRef<string | null>(null);
  const lastLoggedInUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isRevenueCatSupportedPlatform()) {
      setRevenueCatState(getRevenueCatInitialState());
      setSubscription(createUnavailableSubscriptionSnapshot('unsupported_platform'));
      return;
    }

    const runtimeConfig = getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig);
    const initialRevenueCatState = getRevenueCatInitialState(runtimeConfig, {
      remoteConfigResolved: monetizationConfig !== null,
    });
    if (
      initialRevenueCatState.disabledReason
      && initialRevenueCatState.disabledReason !== 'user_not_authenticated'
    ) {
      setRevenueCatState(initialRevenueCatState);
      if (initialRevenueCatState.disabledReason === 'not_initialized' && isAuthenticated && userId) {
        setSubscription(createLoadingSubscriptionSnapshot(String(userId)));
        return;
      }
      setSubscription(createUnavailableSubscriptionSnapshot(initialRevenueCatState.disabledReason));
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

    const existingSubscription = useMonetizationStore.getState().subscription;
    if (existingSubscription.appUserId !== appUserId || existingSubscription.status === 'unavailable') {
      setSubscription(createLoadingSubscriptionSnapshot(appUserId));
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
        setSubscription(toSubscriptionSnapshot(
          customerInfo,
          REVENUECAT_PREMIUM_ENTITLEMENT_ID,
          appUserId,
        ));
        setRevenueCatState({
          supported: true,
          configured: true,
          ready: true,
          disabledReason: null,
          error: null,
          initializedAt: new Date().toISOString(),
          activeAppUserId: appUserId,
          lastCustomerInfoAt: customerInfo.requestDate ?? new Date().toISOString(),
          diagnostics: getRevenueCatDiagnostics(runtimeConfig),
        });

        void syncCustomerInfo(customerInfo, appUserId, runtimeConfig).catch((syncError) => {
          setRevenueCatState({ error: toSafeRevenueCatErrorMessage(syncError) });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const existing = useMonetizationStore.getState().subscription;
        if (existing.appUserId !== appUserId || existing.status === 'loading') {
          setSubscription({
            ...createUnavailableSubscriptionSnapshot(toSafeRevenueCatErrorMessage(error)),
            status: 'error',
            appUserId,
          });
        }
        setRevenueCatState({
          supported: true,
          configured: false,
          ready: false,
          disabledReason: 'sdk_error',
          error: toSafeRevenueCatErrorMessage(error),
          activeAppUserId: appUserId,
          diagnostics: getRevenueCatDiagnostics(runtimeConfig),
        });
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, monetizationConfig, resetBillingState, setRevenueCatState, setSubscription, userId]);

  useEffect(() => {
    const appUserId = getRevenueCatAppUserId(isAuthenticated ? userId : null);
    if (!isHydrated || !appUserId || !isRevenueCatSupportedPlatform()) {
      return;
    }

    if (!revenueCatReady) {
      return;
    }

    const runtimeConfig = getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig);
    const removeListener = addRevenueCatCustomerInfoListener((customerInfo) => {
      const requestDate = customerInfo.requestDate ?? null;
      setSubscription(toSubscriptionSnapshot(
        customerInfo,
        REVENUECAT_PREMIUM_ENTITLEMENT_ID,
        appUserId,
      ));
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
  }, [isAuthenticated, isHydrated, monetizationConfig, revenueCatReady, setRevenueCatState, setSubscription, userId]);

  return <>{children}</>;
}
