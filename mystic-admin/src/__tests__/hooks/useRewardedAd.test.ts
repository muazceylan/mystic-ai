/**
 * useRewardedAd + GPT integration tests.
 *
 * Setup requirements (not yet in package.json — add before running):
 *   pnpm add -D jest @testing-library/react @testing-library/react-hooks
 *              jest-environment-jsdom @types/jest ts-jest
 *
 * jest.config.js:
 *   module.exports = {
 *     testEnvironment: 'jsdom',
 *     preset: 'ts-jest',
 *     moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
 *   };
 */

import { renderHook, act } from '@testing-library/react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import * as rewardsApi from '@/lib/api/rewards';
import * as rewardedAds from '@/lib/ads/rewardedAds';
import * as rewardedEvents from '@/lib/ads/rewardedEvents';

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/rewards');
jest.mock('@/lib/ads/rewardedAds');
jest.mock('@/lib/ads/rewardedEvents');
jest.mock('@/lib/analytics/monetizationAnalytics.web', () => ({
  rewardedAdAnalytics: {
    ctaClicked: jest.fn(),
    intentCreated: jest.fn(),
    notSupported: jest.fn(),
    ready: jest.fn(),
    consentAccepted: jest.fn(),
    consentDeclined: jest.fn(),
    shown: jest.fn(),
    videoCompleted: jest.fn(),
    rewardGranted: jest.fn(),
    claimSuccess: jest.fn(),
    claimFailed: jest.fn(),
    closed: jest.fn(),
    noFill: jest.fn(),
    dailyCapReached: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCreateRewardIntent = rewardsApi.createRewardIntent as jest.MockedFunction<typeof rewardsApi.createRewardIntent>;
const mockGetWalletSummary   = rewardsApi.getWalletSummary   as jest.MockedFunction<typeof rewardsApi.getWalletSummary>;
const mockMarkIntentReady    = rewardsApi.markIntentReady    as jest.MockedFunction<typeof rewardsApi.markIntentReady>;
const mockClaimReward        = rewardsApi.claimReward        as jest.MockedFunction<typeof rewardsApi.claimReward>;
const mockRequestRewardedAd  = rewardedAds.requestRewardedAd as jest.MockedFunction<typeof rewardedAds.requestRewardedAd>;
const mockDestroySlot        = rewardedAds.destroyRewardedSlot as jest.MockedFunction<typeof rewardedAds.destroyRewardedSlot>;
const mockMakeVisible        = rewardedAds.makeRewardedVisible  as jest.MockedFunction<typeof rewardedAds.makeRewardedVisible>;
const mockAddListener        = rewardedEvents.addRewardedAdListener as jest.MockedFunction<typeof rewardedEvents.addRewardedAdListener>;

const WALLET_SUMMARY = {
  currentBalance: 20,
  lifetimeEarned: 50,
  dailyEarnedToday: 10,
  dailyLimit: 50,
  remainingToday: 40,
  dailyCapReached: false,
  rewardAmountPerAd: 5,
  rewardedAdsEnabled: true,
};

const INTENT = {
  intentId: 'intent-uuid-1',
  rewardAmount: 5,
  rewardType: 'GURU_TOKEN',
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  adConfig: {
    adUnitPath: '/12345/mysticai/rewarded_earn',
    supported: true,
    placementKey: 'web_earn_page',
  },
};

const FRESH_CLAIM_RESPONSE = {
  success: true,
  walletBalance: 25,
  grantedAmount: 5,
  rewardType: 'GURU_TOKEN',
  ledgerEntryId: 'ledger-id',
  message: '+5 Guru Token hesabına eklendi.',
  idempotentReplay: false, // fresh claim
};

// ── Test helpers ────────────────────────────────────────────────────────────

let capturedListener: ((event: rewardedEvents.RewardedAdEvent) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  capturedListener = null;

  mockGetWalletSummary.mockResolvedValue(WALLET_SUMMARY);
  mockCreateRewardIntent.mockResolvedValue(INTENT);
  mockRequestRewardedAd.mockResolvedValue('ready');
  mockClaimReward.mockResolvedValue(FRESH_CLAIM_RESPONSE);
  mockMarkIntentReady.mockResolvedValue(undefined);
  mockDestroySlot.mockImplementation(() => {});
  mockMakeVisible.mockImplementation(() => {});

  // Capture the listener for simulating GPT events.
  mockAddListener.mockImplementation((listener) => {
    capturedListener = listener;
    return () => { capturedListener = null; };
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useRewardedAd', () => {
  test('initial phase is idle; wallet summary fetched on mount', async () => {
    const { result } = renderHook(() => useRewardedAd());

    expect(result.current.phase).toBe('idle');

    // Wait for wallet fetch.
    await act(async () => {});
    expect(mockGetWalletSummary).toHaveBeenCalledTimes(1);
    expect(result.current.walletSummary?.currentBalance).toBe(20);
  });

  test('startAdFlow transitions idle → creating → loading_ad', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => {
      await result.current.startAdFlow();
    });

    expect(mockCreateRewardIntent).toHaveBeenCalledTimes(1);
    expect(mockRequestRewardedAd).toHaveBeenCalledTimes(1);
    // After requestRewardedAd resolves 'ready', phase is loading_ad until GPT event.
    expect(result.current.intent?.intentId).toBe('intent-uuid-1');
  });

  test('createRewardIntent is NOT sent with X-User-Id header (auth via Bearer JWT only)', async () => {
    // WHY: UserJwtFilter on the backend validates the Bearer token independently.
    // X-User-Id from the client is untrusted and must not be sent.
    // The rewards API client sends Authorization: Bearer <token> only.
    // We verify that createRewardIntent is called without any userId argument
    // (the API client handles auth headers internally via auth_token cookie/localStorage).
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });

    // The hook must not pass a userId/X-User-Id to createRewardIntent.
    // The function signature is createRewardIntent(page: string), no userId param.
    expect(mockCreateRewardIntent).toHaveBeenCalledWith(
      expect.stringContaining('/') // page path only — no userId arg
    );
    // Ensure only one argument (page) is passed — not two (page + userId).
    expect(mockCreateRewardIntent.mock.calls[0]).toHaveLength(1);
  });

  test('GPT SLOT_READY event transitions to consent phase', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });

    // Simulate GPT rewardedSlotReady event.
    await act(async () => {
      capturedListener?.({
        type: 'SLOT_READY',
        adSessionId: 'gpt-session-1',
        makeRewardedVisible: jest.fn(),
      });
    });

    expect(result.current.phase).toBe('consent');
  });

  test('confirmConsent calls makeRewardedVisible and transitions to showing', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });

    expect(result.current.phase).toBe('consent');

    await act(async () => { result.current.confirmConsent(); });

    expect(mockMakeVisible).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('showing');
  });

  test('declineConsent destroys slot and returns to idle', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });

    await act(async () => { result.current.declineConsent(); });

    expect(mockDestroySlot).toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  test('SLOT_GRANTED event triggers claim and transitions to success (idempotentReplay=false)', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });
    await act(async () => { result.current.confirmConsent(); });

    // Simulate grant event.
    await act(async () => {
      capturedListener?.({
        type: 'SLOT_GRANTED',
        adSessionId: 'sess',
        grantedPayload: { type: 'IN_APP_PURCHASE', amount: 1 },
      });
    });

    expect(mockClaimReward).toHaveBeenCalledWith(
      'intent-uuid-1',
      expect.objectContaining({ adSessionId: 'sess' })
    );
    expect(result.current.phase).toBe('success');
    expect(result.current.claimResult?.walletBalance).toBe(25);
    expect(result.current.claimResult?.idempotentReplay).toBe(false);
  });

  test('safe idempotent replay (idempotentReplay=true) renders as success, not error', async () => {
    // WHY: backend returns HTTP 200 with idempotentReplay=true when the same
    // fingerprint arrives twice (network retry). UI should show success —
    // the user doesn't need to know it was a retry; no double-credit occurred.
    mockClaimReward.mockResolvedValue({
      ...FRESH_CLAIM_RESPONSE,
      idempotentReplay: true,
      grantedAmount: 5,
      walletBalance: 25,
    });

    const { result } = renderHook(() => useRewardedAd());
    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });
    await act(async () => { result.current.confirmConsent(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_GRANTED', adSessionId: 'sess' });
    });

    // Phase must be success, not error.
    expect(result.current.phase).toBe('success');
    expect(result.current.claimResult?.idempotentReplay).toBe(true);
    // No error state set.
    expect(result.current.errorCode).toBeNull();
  });

  test('SESSION_CONFLICT (409) sets phase to error with SESSION_CONFLICT code', async () => {
    // WHY: SESSION_CONFLICT means a different GPT session already claimed this
    // intent (cross-tab abuse or race condition). The hook maps this to 'error'
    // with a non-retryable code. The UI shows a specific message and no retry button.
    mockClaimReward.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { code: 'SESSION_CONFLICT', message: 'Farklı oturum zaten kullandı.' },
      },
      message: 'Request failed with status code 409',
    });

    const { result } = renderHook(() => useRewardedAd());
    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });
    await act(async () => { result.current.confirmConsent(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_GRANTED', adSessionId: 'sess' });
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorCode).toBe('SESSION_CONFLICT');
    // Message should be non-alarming and explain the situation.
    expect(result.current.errorMessage).toContain('oturum');
  });

  test('mark-ready failure does NOT block the claim (telemetry-only endpoint)', async () => {
    // WHY: mark-ready is now telemetry-only. Even if it throws, the ad flow
    // continues and claim succeeds normally.
    mockMarkIntentReady.mockRejectedValue(new Error('mark-ready network error'));

    const { result } = renderHook(() => useRewardedAd());
    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_READY', adSessionId: 'sess', makeRewardedVisible: jest.fn() });
    });

    // Consent phase reached despite mark-ready failure.
    expect(result.current.phase).toBe('consent');

    await act(async () => { result.current.confirmConsent(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_GRANTED', adSessionId: 'sess' });
    });

    // Claim succeeded — mark-ready failure didn't block it.
    expect(result.current.phase).toBe('success');
    expect(mockClaimReward).toHaveBeenCalledTimes(1);
  });

  test('SLOT_NO_FILL transitions to no_fill phase', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_NO_FILL', adSessionId: 'sess' });
    });

    expect(result.current.phase).toBe('no_fill');
    expect(result.current.errorCode).toBe('NO_FILL');
  });

  test('requestRewardedAd returning unsupported transitions to unsupported phase', async () => {
    mockRequestRewardedAd.mockResolvedValue('unsupported');

    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });

    expect(result.current.phase).toBe('unsupported');
    expect(result.current.errorCode).toBe('UNSUPPORTED');
  });

  test('destroyRewardedSlot called on unmount', async () => {
    const { result, unmount } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    unmount();

    expect(mockDestroySlot).toHaveBeenCalled();
  });

  test('resetFlow returns to idle and destroys slot', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });
    await act(async () => {
      capturedListener?.({ type: 'SLOT_NO_FILL', adSessionId: 'sess' });
    });

    await act(async () => { result.current.resetFlow(); });

    expect(result.current.phase).toBe('idle');
    expect(result.current.intent).toBeNull();
    expect(mockDestroySlot).toHaveBeenCalled();
  });

  test('daily cap from API sets phase to cap_reached', async () => {
    mockCreateRewardIntent.mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'DAILY_CAP_REACHED', message: 'Günlük limit doldu.' } },
      message: 'Request failed',
    });

    const { result } = renderHook(() => useRewardedAd());

    await act(async () => { await result.current.startAdFlow(); });

    expect(result.current.phase).toBe('cap_reached');
    expect(result.current.errorCode).toBe('DAILY_CAP_REACHED');
  });
});
