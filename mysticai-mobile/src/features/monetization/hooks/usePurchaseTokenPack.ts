import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { syncRevenueCatBilling } from '../api/monetization.service';
import { refreshMonetizationState } from '../services/monetizationRefresh';
import {
  getRevenueCatSdkConfigFromMonetizationConfig,
  isRevenueCatPurchaseCancelled,
  purchaseRevenueCatPackage,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { useMonetizationStore } from '../store/useMonetizationStore';
import type { ResolvedPaywallProduct } from '../types/billing';

type PurchaseTokenStatus =
  | 'idle'
  | 'processing'
  | 'success'
  | 'pending_backend'
  | 'cancelled'
  | 'failed';

export function usePurchaseTokenPack() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const revenueCatState = useMonetizationStore((state) => state.revenueCat);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const currentBalance = useGuruWalletStore((state) => state.getBalance());
  const [status, setStatus] = useState<PurchaseTokenStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const purchaseTokenPack = useCallback(async (product: ResolvedPaywallProduct) => {
    if (!userId || !revenueCatState.ready || !product.revenueCatPackage) {
      setStatus('failed');
      setError('Token purchases are not available right now.');
      return { status: 'failed' as const };
    }

    try {
      setStatus('processing');
      setError(null);

      trackMonetizationEvent('token_purchase_started', {
        product_key: product.productKey,
        offering_id: product.offeringId,
      });

      const result = await purchaseRevenueCatPackage(product.revenueCatPackage);
      await syncRevenueCatBilling(
        toRevenueCatSyncPayload(
          result.customerInfo,
          getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
        ),
      );
      const refreshed = await refreshMonetizationState(queryClient, userId);
      const nextBalance = refreshed.entitlements?.tokenBalance ?? currentBalance;

      if (nextBalance > currentBalance) {
        trackMonetizationEvent('token_purchase_success', {
          product_key: product.productKey,
          store_product_id: result.productIdentifier,
          balance_after: nextBalance,
        });
        setStatus('success');
        return { status: 'success' as const };
      }

      trackMonetizationEvent('token_purchase_success', {
        product_key: product.productKey,
        store_product_id: result.productIdentifier,
        pending_backend: true,
      });
      setStatus('pending_backend');
      return { status: 'pending_backend' as const };
    } catch (purchaseError) {
      if (isRevenueCatPurchaseCancelled(purchaseError)) {
        setStatus('cancelled');
        return { status: 'cancelled' as const };
      }

      const message = toSafeRevenueCatErrorMessage(purchaseError);
      trackMonetizationEvent('token_purchase_failed', {
        product_key: product.productKey,
        reason: message,
      });
      setStatus('failed');
      setError(message);
      return { status: 'failed' as const, error: message };
    }
  }, [currentBalance, monetizationConfig, queryClient, revenueCatState.ready, userId]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    isProcessing: status === 'processing',
    purchaseTokenPack,
    reset,
  };
}
