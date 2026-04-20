// ── Reward Intent ─────────────────────────────────────────────────────────────

export type RewardIntentStatus =
  | 'PENDING'
  | 'AD_READY'
  | 'AD_SHOWN'
  | 'GRANTED'
  | 'CLAIMED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED';

export interface AdConfig {
  adUnitPath: string;
  supported: boolean;
  placementKey: string;
}

export interface CreateRewardIntentResponse {
  intentId: string;
  rewardAmount: number;
  rewardType: string;
  expiresAt: string;
  adConfig: AdConfig;
}

export interface MarkReadyRequest {
  adSessionId: string;
  clientEventId: string;
}

export interface ClaimRewardRequest {
  adSessionId: string;
  clientEventId: string;
  pageContext?: string;
  userAgentSnapshot?: string;
  grantedPayloadSummary?: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  walletBalance: number;
  grantedAmount: number;
  rewardType: string;
  ledgerEntryId: string;
  message: string;
  /**
   * true  → backend returned 200 but this was a safe idempotent retry
   *         (same fingerprint, no double-credit). Show success UI with
   *         a "already credited" note rather than a "+N Token" celebration.
   * false → fresh claim; wallet was actually credited right now.
   */
  idempotentReplay: boolean;
}

export interface RewardWalletSummaryResponse {
  currentBalance: number;
  lifetimeEarned: number;
  dailyEarnedToday: number;
  dailyLimit: number;
  remainingToday: number;
  dailyCapReached: boolean;
  rewardAmountPerAd: number;
  rewardedAdsEnabled: boolean;
}

// ── UI state machine ──────────────────────────────────────────────────────────

export type RewardedAdPhase =
  | 'idle'           // no active session
  | 'creating'       // POST /intents in-flight
  | 'loading_ad'     // GPT slot requested, waiting for ready event
  | 'consent'        // ad is ready; waiting for user confirmation
  | 'showing'        // makeRewardedVisible() called
  | 'granted'        // rewardedSlotGranted fired
  | 'claiming'       // POST /claim in-flight
  | 'success'        // claim confirmed; token added
  | 'no_fill'        // GPT returned no ad inventory
  | 'unsupported'    // GPT rewarded not available in this environment
  | 'error'          // transient error (API fail, network, etc.)
  | 'cap_reached'    // daily or hourly limit hit
  | 'closed';        // ad closed without grant (user dismissed)

export interface RewardedAdState {
  phase: RewardedAdPhase;
  intent: CreateRewardIntentResponse | null;
  claimResult: ClaimRewardResponse | null;
  walletSummary: RewardWalletSummaryResponse | null;
  errorCode: string | null;
  errorMessage: string | null;
}

// ── Analytics event payload ───────────────────────────────────────────────────

export interface RewardAdAnalyticsPayload {
  intentId?: string;
  placementKey?: string;
  page: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  rewardAmount?: number;
  result?: string;
  failureReason?: string;
  userId?: string; // anonymized
}
