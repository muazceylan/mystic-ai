import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { processSpend } from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';

type SpendStatus = 'idle' | 'processing' | 'success' | 'insufficient' | 'failed';

interface UseGuruUnlockResult {
  status: SpendStatus;
  spendGuru: () => Promise<boolean>;
  reset: () => void;
}

export function useGuruUnlock(moduleKey: string, actionKey: string): UseGuruUnlockResult {
  const [status, setStatus] = useState<SpendStatus>('idle');
  const { getAction } = useMonetizationStore();
  const { getBalance, refreshBalance } = useGuruWalletStore();

  const spendGuru = useCallback(async (): Promise<boolean> => {
    const action = getAction(actionKey, moduleKey);
    if (!action) {
      setStatus('failed');
      return false;
    }

    const balance = getBalance();
    if (balance < action.guruCost) {
      trackMonetizationEvent('token_unlock_failed', {
        module_key: moduleKey,
        action_key: actionKey,
        reason: 'insufficient_balance',
        balance_before: balance,
        token_cost: action.guruCost,
      });
      setStatus('insufficient');
      return false;
    }

    try {
      setStatus('processing');

      const idempotencyKey = `spend_${moduleKey}_${actionKey}_${Date.now()}`;

      await processSpend({
        cost: action.guruCost,
        moduleKey,
        actionKey,
        platform: Platform.OS,
        locale: i18n.language,
        idempotencyKey,
      });

      await refreshBalance();

      trackMonetizationEvent('token_unlock_success', {
        module_key: moduleKey,
        action_key: actionKey,
        token_cost: action.guruCost,
        balance_before: balance,
        balance_after: balance - action.guruCost,
      });

      setStatus('success');
      return true;
    } catch (error) {
      trackMonetizationEvent('token_unlock_failed', {
        module_key: moduleKey,
        action_key: actionKey,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      setStatus('failed');
      return false;
    }
  }, [moduleKey, actionKey, getAction, getBalance, refreshBalance]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, spendGuru, reset };
}
