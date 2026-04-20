'use client';

/**
 * useRewardedAd — primary hook for the web rewarded-ad flow.
 *
 * State machine:
 *   idle → creating → loading_ad → consent → showing → granted → claiming → success
 *                                           ↓
 *                                        declined → idle
 *   Any phase → error | no_fill | unsupported | cap_reached | closed → idle (after reset)
 *
 * Concurrency safety:
 * - Only one active intent per hook instance.
 * - GPT slot is destroyed on unmount and on route change.
 * - Claim is sent exactly once (phase 'claiming' prevents re-entry).
 * - Backend is idempotent; even if claim fires twice, only one ledger entry is created.
 *
 * Usage:
 *   const { phase, walletSummary, startAdFlow, confirmConsent, resetFlow } = useRewardedAd();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  requestRewardedAd,
  makeRewardedVisible,
  destroyRewardedSlot,
} from '@/lib/ads/rewardedAds';
import {
  addRewardedAdListener,
  RewardedAdEvent,
} from '@/lib/ads/rewardedEvents';
import {
  createRewardIntent,
  markIntentReady,
  claimReward,
  getWalletSummary,
  extractApiError,
} from '@/lib/api/rewards';
import { rewardedAdAnalytics } from '@/lib/analytics/monetizationAnalytics.web';
import type {
  RewardedAdPhase,
  RewardedAdState,
  CreateRewardIntentResponse,
  RewardWalletSummaryResponse,
  ClaimRewardResponse,
} from '@/types/rewards';

function createClientEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const INITIAL_STATE: RewardedAdState = {
  phase: 'idle',
  intent: null,
  claimResult: null,
  walletSummary: null,
  errorCode: null,
  errorMessage: null,
};

export interface UseRewardedAdReturn {
  phase: RewardedAdPhase;
  intent: CreateRewardIntentResponse | null;
  claimResult: ClaimRewardResponse | null;
  walletSummary: RewardWalletSummaryResponse | null;
  errorCode: string | null;
  errorMessage: string | null;
  /** Initiates the full flow: creates intent + loads GPT slot. */
  startAdFlow: () => Promise<void>;
  /** Called when user confirms the consent dialog. Shows the ad. */
  confirmConsent: () => void;
  /** Called when user declines the consent dialog. */
  declineConsent: () => void;
  /** Resets the hook to idle state (e.g., after success or error). */
  resetFlow: () => void;
  /** Refresh wallet summary from the server. */
  refreshWallet: () => Promise<void>;
}

export function useRewardedAd(): UseRewardedAdReturn {
  const [state, setState] = useState<RewardedAdState>(INITIAL_STATE);
  const clientEventIdRef = useRef<string>('');
  // Track the current intent id for use in the GPT callback closure.
  const intentIdRef = useRef<string | null>(null);
  // Prevent double-claim if grant event fires twice.
  const claimInProgressRef = useRef(false);
  // Whether component is still mounted (avoid setState after unmount).
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      destroyRewardedSlot(); // Clean up on unmount / route change.
    };
  }, []);

  // ── Wallet summary fetch ─────────────────────────────────────────────────

  const refreshWallet = useCallback(async () => {
    try {
      const summary = await getWalletSummary();
      if (mountedRef.current) {
        setState((s) => ({ ...s, walletSummary: summary }));
      }
    } catch {
      // Non-critical; wallet summary failure doesn't break the flow.
    }
  }, []);

  // Fetch wallet on mount.
  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // ── GPT event listener ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = addRewardedAdListener(async (event: RewardedAdEvent) => {
      if (!mountedRef.current) return;

      switch (event.type) {
        case 'SLOT_READY':
          setState((s) => ({
            ...s,
            phase: 'consent',
            errorCode: null,
            errorMessage: null,
          }));
          // Notify backend intent is ad-ready.
          if (intentIdRef.current && event.adSessionId) {
            try {
              await markIntentReady(intentIdRef.current, {
                adSessionId: event.adSessionId,
                clientEventId: clientEventIdRef.current,
              });
            } catch {
              // Non-blocking; proceed to consent regardless.
            }
            rewardedAdAnalytics.ready({
              intentId: intentIdRef.current,
              placementKey: state.intent?.adConfig.placementKey,
              page: window.location.pathname,
            });
          }
          break;

        case 'SLOT_GRANTED':
          setState((s) => ({ ...s, phase: 'granted' }));
          if (intentIdRef.current) {
            rewardedAdAnalytics.rewardGranted({
              intentId: intentIdRef.current,
              rewardAmount: state.intent?.rewardAmount,
              page: window.location.pathname,
            });
            // Auto-claim after grant event.
            await handleClaim(event);
          }
          break;

        case 'SLOT_VIDEO_COMPLETED':
          // Track but don't change phase — wait for GRANTED event.
          if (intentIdRef.current) {
            rewardedAdAnalytics.videoCompleted({
              intentId: intentIdRef.current,
              page: window.location.pathname,
            });
          }
          break;

        case 'SLOT_CLOSED':
          if (mountedRef.current) {
            // If we already reached 'success', don't override.
            setState((s) =>
              s.phase === 'success'
                ? s
                : { ...s, phase: 'closed', errorCode: null, errorMessage: null }
            );
            rewardedAdAnalytics.closed({
              intentId: intentIdRef.current ?? undefined,
              page: window.location.pathname,
            });
            // Refresh wallet to reflect any granted tokens.
            refreshWallet();
          }
          break;

        case 'SLOT_NO_FILL':
          if (mountedRef.current) {
            setState((s) => ({
              ...s,
              phase: 'no_fill',
              errorCode: 'NO_FILL',
              errorMessage: 'Şu an uygun reklam bulunamadı. Lütfen daha sonra deneyin.',
            }));
            rewardedAdAnalytics.noFill({
              placementKey: state.intent?.adConfig.placementKey,
              page: window.location.pathname,
            });
          }
          break;

        case 'SLOT_ERROR':
          if (mountedRef.current) {
            const isUnsupported =
              event.error?.includes('not supported') ||
              event.error?.includes('not available');
            setState((s) => ({
              ...s,
              phase: isUnsupported ? 'unsupported' : 'error',
              errorCode: isUnsupported ? 'UNSUPPORTED' : 'GPT_ERROR',
              errorMessage: isUnsupported
                ? 'Bu cihaz veya tarayıcı rewarded reklam desteklemiyor.'
                : 'Reklam yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.',
            }));
          }
          break;
      }
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshWallet]);

  // ── Claim helper ─────────────────────────────────────────────────────────

  const handleClaim = useCallback(
    async (event: RewardedAdEvent) => {
      if (claimInProgressRef.current) return;
      if (!intentIdRef.current) return;

      claimInProgressRef.current = true;
      if (mountedRef.current) setState((s) => ({ ...s, phase: 'claiming' }));

      try {
        const result = await claimReward(intentIdRef.current, {
          adSessionId: event.adSessionId ?? '',
          clientEventId: clientEventIdRef.current,
          pageContext: typeof window !== 'undefined' ? window.location.pathname : '/earn',
          userAgentSnapshot: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          grantedPayloadSummary: event.grantedPayload
            ? JSON.stringify(event.grantedPayload)
            : undefined,
        });

        if (mountedRef.current) {
          // Both fresh claims and safe idempotent replays land here (HTTP 200).
          // idempotentReplay=true means the wallet was already credited; no
          // double-credit occurred. The UI shows success, but the dialog
          // distinguishes the two cases so the user isn't confused.
          setState((s) => ({
            ...s,
            phase: 'success',
            claimResult: result,
            walletSummary: s.walletSummary
              ? { ...s.walletSummary, currentBalance: result.walletBalance }
              : null,
          }));
          rewardedAdAnalytics.claimSuccess({
            intentId: intentIdRef.current ?? undefined,
            rewardAmount: result.grantedAmount,
            page: window.location.pathname,
            result: result.idempotentReplay ? 'idempotent_replay' : 'fresh',
          });
          refreshWallet();
        }
      } catch (err) {
        const apiErr = extractApiError(err);
        const code = apiErr?.code ?? 'CLAIM_FAILED';

        // SESSION_CONFLICT (409) — a different GPT session already claimed this
        // intent. Not retryable; show a specific, non-alarming message.
        const message =
          code === 'SESSION_CONFLICT'
            ? 'Bu ödül zaten farklı bir oturum üzerinden hesabına eklenmiş. Çift ödül engelidir.'
            : (apiErr?.message ?? 'Ödül alınamadı. Lütfen tekrar deneyin.');

        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            phase: 'error',
            errorCode: code,
            errorMessage: message,
          }));
          rewardedAdAnalytics.claimFailed({
            intentId: intentIdRef.current ?? undefined,
            failureReason: code,
            page: window.location.pathname,
          });
        }
      } finally {
        claimInProgressRef.current = false;
      }
    },
    [refreshWallet]
  );

  // ── Public actions ───────────────────────────────────────────────────────

  const startAdFlow = useCallback(async () => {
    if (state.phase !== 'idle' && state.phase !== 'error' && state.phase !== 'closed') return;

    rewardedAdAnalytics.ctaClicked({
      placementKey: process.env.NEXT_PUBLIC_GAM_REWARDED_PLACEMENT_KEY ?? 'web_earn_page',
      page: typeof window !== 'undefined' ? window.location.pathname : '/earn',
    });

    setState({ ...INITIAL_STATE, walletSummary: state.walletSummary, phase: 'creating' });
    claimInProgressRef.current = false;
    clientEventIdRef.current = createClientEventId();

    // Step 1: Create intent on backend.
    let intent: CreateRewardIntentResponse;
    try {
      intent = await createRewardIntent(
        typeof window !== 'undefined' ? window.location.pathname : '/earn'
      );
    } catch (err) {
      const apiErr = extractApiError(err);
      const code = apiErr?.code ?? 'CREATE_FAILED';
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          phase: code === 'DAILY_CAP_REACHED' || code === 'HOURLY_CAP_REACHED'
            ? 'cap_reached'
            : 'error',
          errorCode: code,
          errorMessage: apiErr?.message ?? 'Reklam seansı başlatılamadı.',
        }));
        if (code === 'DAILY_CAP_REACHED') rewardedAdAnalytics.dailyCapReached({ page: window.location.pathname });
      }
      return;
    }

    intentIdRef.current = intent.intentId;
    if (mountedRef.current) setState((s) => ({ ...s, intent, phase: 'loading_ad' }));
    rewardedAdAnalytics.intentCreated({
      intentId: intent.intentId,
      rewardAmount: intent.rewardAmount,
      placementKey: intent.adConfig.placementKey,
      page: typeof window !== 'undefined' ? window.location.pathname : '/earn',
    });

    // Step 2: Request GPT rewarded slot.
    const adUnitPath =
      intent.adConfig.adUnitPath ||
      process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT_PATH ||
      '';

    const result = await requestRewardedAd(adUnitPath, clientEventIdRef.current);

    if (result === 'unsupported') {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          phase: 'unsupported',
          errorCode: 'UNSUPPORTED',
          errorMessage:
            'Bu ortam rewarded reklamları desteklemiyor. Lütfen masaüstü tarayıcı kullanın.',
        }));
        rewardedAdAnalytics.notSupported({ page: window.location.pathname });
      }
    }
    // 'ready' and 'error' are handled by the GPT event listener.
  }, [state.phase, state.walletSummary]);

  const confirmConsent = useCallback(() => {
    if (state.phase !== 'consent') return;
    setState((s) => ({ ...s, phase: 'showing' }));
    rewardedAdAnalytics.consentAccepted({
      intentId: state.intent?.intentId,
      placementKey: state.intent?.adConfig.placementKey,
      page: typeof window !== 'undefined' ? window.location.pathname : '/earn',
    });
    rewardedAdAnalytics.shown({ intentId: state.intent?.intentId, page: typeof window !== 'undefined' ? window.location.pathname : '/earn' });
    makeRewardedVisible();
  }, [state.phase, state.intent]);

  const declineConsent = useCallback(() => {
    if (state.phase !== 'consent') return;
    rewardedAdAnalytics.consentDeclined({
      intentId: state.intent?.intentId,
      placementKey: state.intent?.adConfig.placementKey,
      page: typeof window !== 'undefined' ? window.location.pathname : '/earn',
    });
    destroyRewardedSlot();
    setState((s) => ({ ...s, phase: 'idle', errorCode: null, errorMessage: null }));
  }, [state.phase, state.intent]);

  const resetFlow = useCallback(() => {
    destroyRewardedSlot();
    claimInProgressRef.current = false;
    intentIdRef.current = null;
    setState((s) => ({ ...INITIAL_STATE, walletSummary: s.walletSummary }));
  }, []);

  return {
    phase: state.phase,
    intent: state.intent,
    claimResult: state.claimResult,
    walletSummary: state.walletSummary,
    errorCode: state.errorCode,
    errorMessage: state.errorMessage,
    startAdFlow,
    confirmConsent,
    declineConsent,
    resetFlow,
    refreshWallet,
  };
}
