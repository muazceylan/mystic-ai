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
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import { toSubscriptionSnapshot } from '../services/subscriptionSnapshot';
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
  | 'cancelled'
  | 'failed';

export function usePurchasePremium() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const revenueCatState = useMonetizationStore((state) => state.revenueCat);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const setSubscription = useMonetizationStore((state) => state.setSubscription);
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
        'is trial': product.verifiedTrialEligible === true,
        price: product.localizedPrice ?? product.price ?? null,
        currency: product.currency ?? null,
        'offer id': product.offeringId ?? product.productKey,
      });

      if (product.verifiedTrialEligible === true) {
        trackMonetizationEvent('trial_start_clicked', {
          product_key: product.productKey,
          trial_duration: product.verifiedTrialDurationIso8601,
        });
      }

      const result = await purchaseRevenueCatPackage(product.revenueCatPackage);
      const revenueCatPremiumActive = isRevenueCatPremiumActive(result.customerInfo);
      setSubscription(toSubscriptionSnapshot(
        result.customerInfo,
        REVENUECAT_PREMIUM_ENTITLEMENT_ID,
        String(userId),
      ));

      const syncPayload = toRevenueCatSyncPayload(
        result.customerInfo,
        getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
        result,
      );
      const [syncResult] = await Promise.allSettled([
        syncRevenueCatBilling(syncPayload),
      ]);
      const [refreshResult] = await Promise.allSettled([
        refreshMonetizationState(queryClient, userId),
      ]);

      if (revenueCatPremiumActive) {
        const refreshed = refreshResult.status === 'fulfilled' ? refreshResult.value : null;
        if (refreshed?.entitlements?.trialing) {
          trackMonetizationEvent('trial_started', {
            product_key: product.productKey,
          });
        }
        trackMonetizationEvent('subscription_purchase_completed', {
          product_key: product.productKey,
          store_product_id: result.productIdentifier,
        });
        trackMonetizationEvent('premium_activated', {
          product_key: product.productKey,
          entitlement_id: REVENUECAT_PREMIUM_ENTITLEMENT_ID,
          backend_sync_succeeded: syncResult.status === 'fulfilled',
        });
        setStatus('success');
        return { status: 'success' as const };
      }

      trackMonetizationEvent('premium_purchase_entitlement_missing', {
        product_key: product.productKey,
        store_product_id: result.productIdentifier,
      });
      const message = 'Purchase completed, but the Premium entitlement is not active.';
      setStatus('failed');
      setError(message);
      return { status: 'failed' as const, error: message };
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
  }, [monetizationConfig, queryClient, revenueCatState.ready, setSubscription, userId]);

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
