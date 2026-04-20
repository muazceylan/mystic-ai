/**
 * API client for the rewarded-ads endpoints.
 *
 * All requests go through the same Next.js rewrite → API Gateway path.
 * Auth token is attached by the existing Axios interceptor in lib/api.ts.
 *
 * NOTE: This module uses a standalone axios instance so it can be used from
 * both the admin panel and any future user-facing pages in this Next.js app.
 * The gateway injects X-User-Id from the JWT; we do NOT set it here.
 */

import axios, { AxiosError } from 'axios';
import type {
  CreateRewardIntentResponse,
  MarkReadyRequest,
  ClaimRewardRequest,
  ClaimRewardResponse,
  RewardWalletSummaryResponse,
} from '@/types/rewards';

const BASE = '/api/v1/monetization/rewarded-ads';

/**
 * Axios instance for user-facing reward endpoints.
 * Uses Authorization header (JWT from localStorage 'auth_token').
 */
const rewardsAxios = axios.create({ baseURL: '' });

rewardsAxios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Reward API functions ───────────────────────────────────────────────────────

/**
 * Creates a pending reward intent and returns ad config + reward amount.
 * Call this BEFORE requesting the GPT slot to verify user eligibility.
 */
export async function createRewardIntent(
  page = '/earn'
): Promise<CreateRewardIntentResponse> {
  const response = await rewardsAxios.post<CreateRewardIntentResponse>(
    `${BASE}/intents`,
    null,
    { params: { page } }
  );
  return response.data;
}

/**
 * Notifies the backend when GPT fires rewardedSlotReady.
 * Transitions the intent to AD_READY.
 */
export async function markIntentReady(
  intentId: string,
  body: MarkReadyRequest
): Promise<void> {
  await rewardsAxios.post(`${BASE}/intents/${intentId}/mark-ready`, body);
}

/**
 * Claims the reward after GPT fires rewardedSlotGranted.
 * Idempotent: duplicate calls return the existing ledger state.
 *
 * @throws AxiosError with response.data.code for structured error handling.
 */
export async function claimReward(
  intentId: string,
  body: ClaimRewardRequest
): Promise<ClaimRewardResponse> {
  const response = await rewardsAxios.post<ClaimRewardResponse>(
    `${BASE}/intents/${intentId}/claim`,
    body
  );
  return response.data;
}

/**
 * Fetches the user's Guru Token wallet summary including daily cap status.
 */
export async function getWalletSummary(): Promise<RewardWalletSummaryResponse> {
  const response = await rewardsAxios.get<RewardWalletSummaryResponse>(
    `${BASE}/wallet-summary`
  );
  return response.data;
}

// ── Error helpers ────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  code: string;
  message: string;
}

export function extractApiError(err: unknown): ApiErrorBody | null {
  if (!axios.isAxiosError(err)) return null;
  const axiosErr = err as AxiosError<ApiErrorBody>;
  if (axiosErr.response?.data?.code) return axiosErr.response.data;
  return { code: 'UNKNOWN', message: axiosErr.message };
}
