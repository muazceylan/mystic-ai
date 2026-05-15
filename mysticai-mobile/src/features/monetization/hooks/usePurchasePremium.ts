import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { syncRevenueCatBilling } from '../api/monetization.service';
import { refreshMonetizationState } from '../services/monetizationRefresh';
import {
  getRevenueCatSdkConfigFromMonetizationConfig,
  isRevenueCatPremiumActive,
  isRevenueCatPurchaseCancelled,
  purchaseRevenueCatPackage,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import { useMonetizationStore } from '../store/useMonetizationStore';
import type { ResolvedPaywallProduct } from '../types/billing';
import {
  ProductEventName,
  resolveBillingCycle,
  trackProductEvent,
} from '../../../services/productAnalytics';

type PurchasePremiumStatus =
  | 'idle'
  | 'processing'
  | 'success'
  | 'pending_backend'
  | 'cancelled'
  | 'failed';

export function usePurchasePremium() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const revenueCatState = useMonetizationStore((state) => state.revenueCat);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const [status, setStatus] = useState<PurchasePremiumStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const purchasePremium = useCallback(async (product: ResolvedPaywallProduct) => {
    if (!userId || !revenueCatState.ready || !product.revenueCatPackage) {
      setStatus('failed');
      setError('Premium purchases are not available right now.');
      return { status: 'failed' as const };
    }

    try {
      setStatus('processing');
      setError(null);

      trackMonetizationEvent('subscription_started', {
        product_key: product.productKey,
        offering_id: product.offeringId,
      });
      trackProductEvent(ProductEventName.SUBSCRIPTION_STARTED, {
        'product id': product.revenueCatProductId ?? product.productKey,
        'subscription tier': product.productType ?? product.title ?? 'premium',
        'billing cycle': resolveBillingCycle(
          product.productKey
          ?? product.title
          ?? product.revenueCatProductId
          ?? null,
        ),
        'is trial': Boolean(product.trialDurationDays && product.trialDurationDays > 0),
        price: product.localizedPrice ?? product.price ?? null,
        currency: product.currency ?? null,
        'offer id': product.offeringId ?? product.productKey,
      });

      if (product.trialDurationDays && product.trialDurationDays > 0) {
        trackMonetizationEvent('trial_start_clicked', {
          product_key: product.productKey,
          trial_duration_days: product.trialDurationDays,
        });
      }

      const result = await purchaseRevenueCatPackage(product.revenueCatPackage);
      const revenueCatPremiumActive = isRevenueCatPremiumActive(result.customerInfo);
      await syncRevenueCatBilling(
        toRevenueCatSyncPayload(
          result.customerInfo,
          getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
        ),
      );
      const refreshed = await refreshMonetizationState(queryClient, userId);

      if (revenueCatPremiumActive || refreshed.entitlements?.premiumActive) {
        if (refreshed.entitlements?.trialing) {
          trackMonetizationEvent('trial_started', {
            product_key: product.productKey,
          });
        }
        trackMonetizationEvent('subscription_purchase_completed', {
          product_key: product.productKey,
          store_product_id: result.productIdentifier,
        });
        setStatus('success');
        return { status: 'success' as const };
      }

      trackMonetizationEvent('subscription_purchase_completed', {
        product_key: product.productKey,
        store_product_id: result.productIdentifier,
        pending_backend: true,
      });
      setStatus('pending_backend');
      return { status: 'pending_backend' as const };
    } catch (purchaseError) {
      if (isRevenueCatPurchaseCancelled(purchaseError)) {
        trackMonetizationEvent('premium_purchase_cancelled', {
          product_key: product.productKey,
        });
        setStatus('cancelled');
        return { status: 'cancelled' as const };
      }

      const message = toSafeRevenueCatErrorMessage(purchaseError);
      trackMonetizationEvent('purchase_failed', {
        purchase_type: 'subscription',
        product_key: product.productKey,
        reason: message,
      });
      setStatus('failed');
      setError(message);
      return { status: 'failed' as const, error: message };
    }
  }, [monetizationConfig, queryClient, revenueCatState.ready, userId]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    isProcessing: status === 'processing',
    purchasePremium,
    reset,
  };
}
