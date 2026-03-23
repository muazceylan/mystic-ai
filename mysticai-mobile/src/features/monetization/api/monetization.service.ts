import api from '../../../services/api';
import type { MonetizationConfig, GuruWallet, GuruLedgerEntry, EligibilityResult } from '../types';

const CACHE_TTL = 60_000; // 60 seconds
let cachedConfig: MonetizationConfig | null = null;
let lastFetchedAt = 0;

const DEFAULT_CONFIG: MonetizationConfig = {
  enabled: false,
  adsEnabled: false,
  guruEnabled: false,
  guruPurchaseEnabled: false,
  defaultAdProvider: 'admob',
  globalDailyAdCap: 0,
  globalWeeklyAdCap: 0,
  globalMinHoursBetweenOffers: 24,
  globalMinSessionsBetweenOffers: 1,
  configVersion: 0,
  moduleRules: [],
  actions: [],
  products: [],
  walletBalance: 0,
  fetchedAt: new Date().toISOString(),
};

export async function fetchMonetizationConfig(): Promise<MonetizationConfig> {
  if (cachedConfig && Date.now() - lastFetchedAt < CACHE_TTL) {
    return cachedConfig;
  }
  try {
    const { data } = await api.get<MonetizationConfig>('/api/v1/monetization/config');
    cachedConfig = data;
    lastFetchedAt = Date.now();
    return data;
  } catch (error) {
    console.warn('[Monetization] Config fetch failed, using fallback', error);
    return cachedConfig ?? DEFAULT_CONFIG;
  }
}

export function clearMonetizationCache(): void {
  cachedConfig = null;
  lastFetchedAt = 0;
}

export async function fetchWallet(): Promise<GuruWallet> {
  try {
    const { data } = await api.get<GuruWallet>('/api/v1/monetization/wallet');
    return data;
  } catch (error) {
    console.warn('[Monetization] Wallet fetch failed', error);
    throw error;
  }
}

export async function fetchWalletBalance(): Promise<number> {
  try {
    const { data } = await api.get<{ balance: number }>('/api/v1/monetization/wallet/balance');
    return data.balance;
  } catch (error) {
    console.warn('[Monetization] Balance fetch failed', error);
    throw error;
  }
}

export async function fetchLedger(page = 0, size = 20): Promise<{ content: GuruLedgerEntry[]; totalPages: number }> {
  const { data } = await api.get('/api/v1/monetization/wallet/ledger', { params: { page, size } });
  return data;
}

export async function checkEligibility(
  moduleKey: string,
  actionKey: string,
  entryCount: number,
): Promise<EligibilityResult> {
  const { data } = await api.get<EligibilityResult>('/api/v1/monetization/eligibility', {
    params: { moduleKey, actionKey, entryCount },
  });
  return data;
}

export async function processReward(params: {
  amount: number;
  sourceKey: string;
  moduleKey: string;
  actionKey?: string;
  platform: string;
  locale: string;
  idempotencyKey: string;
}): Promise<GuruLedgerEntry> {
  const { data } = await api.post<GuruLedgerEntry>('/api/v1/monetization/reward', params);
  return data;
}

export async function processSpend(params: {
  cost: number;
  moduleKey: string;
  actionKey: string;
  platform: string;
  locale: string;
  idempotencyKey: string;
}): Promise<GuruLedgerEntry> {
  const { data } = await api.post<GuruLedgerEntry>('/api/v1/monetization/spend', params);
  return data;
}

export async function processPurchase(params: {
  guruAmount: number;
  productKey: string;
  platform: string;
  locale: string;
  idempotencyKey: string;
}): Promise<GuruLedgerEntry> {
  const { data } = await api.post<GuruLedgerEntry>('/api/v1/monetization/purchase', params);
  return data;
}
