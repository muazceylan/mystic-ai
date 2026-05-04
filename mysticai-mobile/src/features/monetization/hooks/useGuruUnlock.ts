import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { consumeFeatureAccess } from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { useModuleMonetization } from './useModuleMonetization';

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
  const monetization = useModuleMonetization(moduleKey);

  const spendGuru = useCallback(async (): Promise<boolean> => {
    const action = getAction(actionKey, moduleKey);
    const unlockState = monetization.getActionUnlockState(actionKey);
    if (!action) {
      setStatus('failed');
      return false;
    }

    const balance = getBalance();
    if (balance < unlockState.guruCost) {
      trackMonetizationEvent('token_unlock_failed', {
        module_key: moduleKey,
        action_key: actionKey,
        reason: 'insufficient_balance',
        balance_before: balance,
        token_cost: unlockState.guruCost,
      });
      setStatus('insufficient');
      return false;
    }

    try {
      setStatus('processing');

      const idempotencyKey = `spend_${moduleKey}_${actionKey}_${Date.now()}`;

      const access = await consumeFeatureAccess({
        moduleKey,
        actionKey,
        platform: Platform.OS,
        locale: i18n.language,
        idempotencyKey,
        sourceScreen: moduleKey,
      });

      if (!access.allowed || access.status !== 'TOKEN_CONSUMED') {
        setStatus(access.status === 'INSUFFICIENT_BALANCE' ? 'insufficient' : 'failed');
        return false;
      }

      await refreshBalance();

      trackMonetizationEvent('token_unlock_success', {
        module_key: moduleKey,
        action_key: actionKey,
        token_cost: access.chargedTokenAmount ?? unlockState.guruCost,
        balance_before: balance,
        balance_after: access.currentBalance,
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
  }, [actionKey, getAction, getBalance, moduleKey, monetization, refreshBalance]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, spendGuru, reset };
}
