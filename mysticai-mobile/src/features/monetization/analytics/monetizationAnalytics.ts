import { trackEvent } from '../../../services/analytics';

export function trackMonetizationEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  trackEvent(`monetization_${eventName}`, {
    ...properties,
    timestamp: Date.now(),
  });
}

// Pre-defined event helpers
export const MonetizationEvents = {
  configLoaded: (configVersion: number) =>
    trackMonetizationEvent('config_loaded', { config_version: configVersion }),

  configFailed: (reason: string) =>
    trackMonetizationEvent('config_failed', { reason }),

  // ── Ad offer lifecycle ──
  adOfferViewed: (moduleKey: string, actionKey?: string) =>
    trackMonetizationEvent('ad_offer_viewed', { module_key: moduleKey, action_key: actionKey }),

  adOfferClicked: (moduleKey: string, actionKey?: string) =>
    trackMonetizationEvent('ad_offer_clicked', { module_key: moduleKey, action_key: actionKey }),

  adOfferDismissed: (moduleKey: string, actionKey?: string) =>
    trackMonetizationEvent('ad_offer_dismissed', { module_key: moduleKey, action_key: actionKey }),

  // ── Rewarded ad lifecycle ──
  rewardedAdLoadStarted: (moduleKey: string, actionKey?: string, adUnitMode?: string) =>
    trackMonetizationEvent('rewarded_ad_load_started', {
      module_key: moduleKey,
      action_key: actionKey,
      ad_provider: 'admob',
      ad_unit_mode: adUnitMode,
    }),

  rewardedAdLoaded: (moduleKey: string, actionKey?: string, adUnitMode?: string) =>
    trackMonetizationEvent('rewarded_ad_loaded', {
      module_key: moduleKey,
      action_key: actionKey,
      ad_provider: 'admob',
      ad_unit_mode: adUnitMode,
    }),

  rewardedAdFailed: (moduleKey: string, actionKey?: string, reason?: string) =>
    trackMonetizationEvent('rewarded_ad_failed', {
      module_key: moduleKey,
      action_key: actionKey,
      ad_provider: 'admob',
      reason,
    }),

  rewardedAdOpened: (moduleKey: string, actionKey?: string) =>
    trackMonetizationEvent('rewarded_ad_opened', {
      module_key: moduleKey,
      action_key: actionKey,
      ad_provider: 'admob',
    }),

  rewardedAdDismissed: (moduleKey: string, actionKey?: string) =>
    trackMonetizationEvent('rewarded_ad_dismissed', {
      module_key: moduleKey,
      action_key: actionKey,
      ad_provider: 'admob',
    }),

  rewardedAdCompleted: (moduleKey: string, actionKey?: string, rewardAmount?: number) =>
    trackMonetizationEvent('rewarded_ad_completed', {
      module_key: moduleKey,
      action_key: actionKey,
      reward_amount: rewardAmount,
      ad_provider: 'admob',
    }),

  rewardedAdRewardGranted: (moduleKey: string, actionKey?: string, rewardAmount?: number) =>
    trackMonetizationEvent('rewarded_ad_reward_granted', {
      module_key: moduleKey,
      action_key: actionKey,
      reward_amount: rewardAmount,
      ad_provider: 'admob',
    }),

  // ── Token / Guru unlock ──
  tokenUnlockClicked: (moduleKey: string, actionKey: string, balance: number, cost: number) =>
    trackMonetizationEvent('token_unlock_clicked', {
      module_key: moduleKey,
      action_key: actionKey,
      balance,
      cost,
    }),

  tokenUnlockSuccess: (moduleKey: string, actionKey: string, cost: number) =>
    trackMonetizationEvent('token_unlock_success', {
      module_key: moduleKey,
      action_key: actionKey,
      cost,
    }),

  tokenBalanceViewed: (balance: number) =>
    trackMonetizationEvent('token_balance_viewed', { balance }),

  tokenEarned: (amount: number, moduleKey: string, source: string) =>
    trackMonetizationEvent('token_earned', { amount, module_key: moduleKey, source }),

  tokenSpent: (amount: number, moduleKey: string, actionKey: string) =>
    trackMonetizationEvent('token_spent', { amount, module_key: moduleKey, action_key: actionKey }),

  // ── Purchase ──
  purchaseCatalogViewed: () =>
    trackMonetizationEvent('purchase_catalog_viewed'),

  purchaseClicked: (productKey: string, price?: string) =>
    trackMonetizationEvent('purchase_clicked', { product_key: productKey, price }),

  // ── Gate / eligibility ──
  gateViewed: (moduleKey: string, actionKey?: string, reason?: string) =>
    trackMonetizationEvent('gate_viewed', { module_key: moduleKey, action_key: actionKey, reason }),

  gateSeen: (moduleKey: string, actionKey: string, gateType: 'ad' | 'guru_spend' | 'purchase') =>
    trackMonetizationEvent('gate_seen', {
      module_key: moduleKey,
      action_key: actionKey,
      gate_type: gateType,
    }),

  ineligibleReason: (moduleKey: string, actionKey: string, reason: string) =>
    trackMonetizationEvent('ineligible_reason', {
      module_key: moduleKey,
      action_key: actionKey,
      reason,
    }),

  // ── Module entry ──
  moduleEntryTracked: (moduleKey: string, entryCount: number) =>
    trackMonetizationEvent('module_entry_tracked', {
      module_key: moduleKey,
      entry_count: entryCount,
    }),
};
