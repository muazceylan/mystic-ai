import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { restoreBilling } from '../api/monetization.service';
import { refreshMonetizationState } from '../services/monetizationRefresh';
import {
  getRevenueCatSdkConfigFromMonetizationConfig,
  restoreRevenueCatPurchases,
  toRevenueCatSyncPayload,
  toSafeRevenueCatErrorMessage,
} from '../services/revenueCatService';
import { useMonetizationStore } from '../store/useMonetizationStore';

type RestorePurchasesStatus = 'idle' | 'processing' | 'success' | 'failed';

export function useRestorePurchases() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const revenueCatState = useMonetizationStore((state) => state.revenueCat);
  const monetizationConfig = useMonetizationStore((state) => state.config);
  const [status, setStatus] = useState<RestorePurchasesStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const restorePurchases = useCallback(async () => {
    if (!userId || !revenueCatState.ready) {
      setStatus('failed');
      setError('Restore is not available right now.');
      return { status: 'failed' as const };
    }

    try {
      setStatus('processing');
      setError(null);
      trackMonetizationEvent('restore_purchase_clicked', {});

      const customerInfo = await restoreRevenueCatPurchases();
      await restoreBilling(
        toRevenueCatSyncPayload(
          customerInfo,
          getRevenueCatSdkConfigFromMonetizationConfig(monetizationConfig),
        ),
      );
      await refreshMonetizationState(queryClient, userId);

      trackMonetizationEvent('restore_purchases_completed', {});
      setStatus('success');
      return { status: 'success' as const };
    } catch (restoreError) {
      const message = toSafeRevenueCatErrorMessage(restoreError);
      trackMonetizationEvent('purchase_failed', {
        purchase_type: 'restore',
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
    restorePurchases,
    reset,
  };
}
