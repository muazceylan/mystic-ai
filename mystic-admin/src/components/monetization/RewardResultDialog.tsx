'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Coins, RefreshCw } from 'lucide-react';
import type { RewardedAdPhase, ClaimRewardResponse } from '@/types/rewards';

interface RewardResultDialogProps {
  phase: RewardedAdPhase;
  claimResult: ClaimRewardResponse | null;
  errorCode: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

const ERROR_USER_MESSAGES: Record<string, string> = {
  NO_FILL: 'Şu an uygun reklam bulunamadı. Daha sonra tekrar deneyin.',
  UNSUPPORTED: 'Bu cihaz veya tarayıcı rewarded reklamları desteklemiyor.',
  DAILY_CAP_REACHED: 'Günlük Guru Token kazanım limitine ulaştınız. Yarın tekrar deneyin.',
  HOURLY_CAP_REACHED: 'Saatlik kazanım limitine ulaştınız. Biraz bekleyin.',
  COOLDOWN_ACTIVE: 'Son reklamdan bu yana bekleme süresi dolmadı.',
  INTENT_EXPIRED: 'Reklam seansının süresi doldu. Lütfen tekrar deneyin.',
  CLAIM_FAILED: 'Ödül alınamadı. Lütfen tekrar deneyin.',
  SESSION_CONFLICT:
    'Bu ödül zaten farklı bir oturum üzerinden hesabına eklenmiş. Çift ödül engelidir.',
  UNKNOWN: 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.',
};

function resolveErrorMessage(code: string | null, raw: string | null): string {
  if (!code) return raw ?? ERROR_USER_MESSAGES.UNKNOWN;
  return ERROR_USER_MESSAGES[code] ?? raw ?? ERROR_USER_MESSAGES.UNKNOWN;
}

function isRetryable(code: string | null): boolean {
  // SESSION_CONFLICT is non-retryable — a different session already consumed
  // this intent. Showing the ad again would create a new intent, not re-claim.
  return (
    code === 'NO_FILL' ||
    code === 'CLAIM_FAILED' ||
    code === 'INTENT_EXPIRED' ||
    code === 'UNKNOWN'
  );
}

/**
 * Modal shown after a rewarded-ad session ends:
 * - Fresh success: celebration — "+N Guru Token" + new balance.
 * - Idempotent replay: calm confirmation — "already credited" note.
 * - SESSION_CONFLICT: non-retryable conflict — distinct message, no retry.
 * - Error/no-fill/closed: user-friendly message + optional retry.
 */
export function RewardResultDialog({
  phase,
  claimResult,
  errorCode,
  errorMessage,
  onClose,
  onRetry,
}: RewardResultDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isSuccess = phase === 'success';
  const isReplay = isSuccess && (claimResult?.idempotentReplay ?? false);
  const userMessage = resolveErrorMessage(errorCode, errorMessage);
  const canRetry = !isSuccess && isRetryable(errorCode);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
          isSuccess ? (isReplay ? 'bg-blue-100' : 'bg-green-100') : 'bg-red-100'
        }`}>
          {isSuccess
            ? <CheckCircle className={`h-8 w-8 ${isReplay ? 'text-blue-500' : 'text-green-600'}`} aria-hidden="true" />
            : <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
          }
        </div>

        {/* Title */}
        <h2
          id="result-dialog-title"
          className="mb-2 text-center text-xl font-bold text-gray-900"
        >
          {isSuccess
            ? (isReplay ? 'Ödül Zaten Hesabında' : 'Token Kazandın!')
            : 'İşlem Tamamlanamadı'}
        </h2>

        {isSuccess && claimResult ? (
          isReplay ? (
            /* ── Idempotent replay variant ─────────────────────────────── */
            <>
              <p className="mb-4 text-center text-sm text-gray-600">
                Bu ödül daha önce hesabına eklenmiştir. Ağ yeniden denemesi nedeniyle
                tekrar gönderildi, ancak bakiyene{' '}
                <strong>çift ekleme yapılmadı</strong>.
              </p>
              <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                <Coins className="h-5 w-5 text-purple-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">
                  Güncel Bakiye:{' '}
                  <strong className="text-purple-700">{claimResult.walletBalance} Token</strong>
                </span>
              </div>
            </>
          ) : (
            /* ── Fresh claim variant ──────────────────────────────────── */
            <>
              <p className="mb-1 text-center text-4xl font-extrabold text-green-600">
                +{claimResult.grantedAmount} Guru Token
              </p>
              <div className="mb-5 mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                <Coins className="h-5 w-5 text-purple-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">
                  Güncel Bakiye:{' '}
                  <strong className="text-purple-700">{claimResult.walletBalance} Token</strong>
                </span>
              </div>
              <p className="mb-5 text-center text-xs text-gray-500">
                {claimResult.message}
              </p>
            </>
          )
        ) : (
          <p className="mb-5 text-center text-sm text-gray-600">{userMessage}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-base font-semibold text-white transition hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
              aria-label="Tekrar dene"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tekrar Dene
            </button>
          )}
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-400"
            aria-label="Kapat"
          >
            {isSuccess ? 'Harika!' : 'Kapat'}
          </button>
        </div>
      </div>
    </div>
  );
}
