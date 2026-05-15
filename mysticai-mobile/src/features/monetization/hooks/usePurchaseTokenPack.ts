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

const TOKEN_AMOUNTS_BY_PRODUCT_ID: Record<string, number> = {
  guru_tokens_50: 50,
  guru_tokens_150: 150,
  guru_tokens_500: 500,
  guru_tokens_1200: 1200,
};

function resolveTokenAmount(product: ResolvedPaywallProduct): number {
  const identifiers = [
    product.storeProductId,
    product.revenueCatProductId,
    product.androidProductId,
    product.iosProductId,
    product.productKey,
  ].filter((value): value is string => Boolean(value));

  for (const id of identifiers) {
    const normalized = id.split(':', 1)[0];
    const exact = TOKEN_AMOUNTS_BY_PRODUCT_ID[normalized];
    if (exact) {
      return exact;
    }
    const prefix = Object.entries(TOKEN_AMOUNTS_BY_PRODUCT_ID)
      .find(([productId]) => normalized.startsWith(productId));
    if (prefix) {
      return prefix[1];
    }
  }

  return (product.tokenAmount ?? 0) + (product.bonusTokenAmount ?? 0);
}

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

      trackMonetizationEvent('token_pack_purchase_started', {
        product_key: product.productKey,
        offering_id: product.offeringId,
        token_amount: resolveTokenAmount(product),
      });

      const result = await purchaseRevenueCatPackage(product.revenueCatPackage);
      await syncRevenueCatBilling(
        toRevenueCatSyncPayload(
          result.customerInfo,
          getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
          result,
        ),
      );
      const refreshed = await refreshMonetizationState(queryClient, userId);
      const nextBalance = refreshed.entitlements?.tokenBalance ?? currentBalance;

      if (nextBalance > currentBalance) {
        trackMonetizationEvent('token_pack_purchase_completed', {
          product_key: product.productKey,
          store_product_id: result.productIdentifier,
          token_amount: resolveTokenAmount(product),
          balance_after: nextBalance,
        });
        setStatus('success');
        return { status: 'success' as const };
      }

      trackMonetizationEvent('token_pack_purchase_completed', {
        product_key: product.productKey,
        store_product_id: result.productIdentifier,
        token_amount: resolveTokenAmount(product),
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
      trackMonetizationEvent('purchase_failed', {
        purchase_type: 'token_pack',
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
