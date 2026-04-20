'use client';

import React from 'react';
import { PlayCircle, Coins, Lock } from 'lucide-react';
import type { RewardedAdPhase, RewardWalletSummaryResponse } from '@/types/rewards';

interface WatchRewardAdCardProps {
  phase: RewardedAdPhase;
  walletSummary: RewardWalletSummaryResponse | null;
  onStart: () => void;
}

/**
 * Primary CTA card shown on the Earn page.
 * Displays reward amount, daily remaining, and a "Watch Ad" button.
 * Button is disabled during active sessions or when cap is reached.
 */
export function WatchRewardAdCard({ phase, walletSummary, onStart }: WatchRewardAdCardProps) {
  const rewardAmount = walletSummary?.rewardAmountPerAd ?? 5;
  const capReached = walletSummary?.dailyCapReached ?? false;
  const remainingToday = walletSummary?.remainingToday ?? 0;
  const adsEnabled = walletSummary?.rewardedAdsEnabled ?? true;

  const isActive =
    phase !== 'idle' &&
    phase !== 'error' &&
    phase !== 'closed' &&
    phase !== 'success' &&
    phase !== 'no_fill';

  const isDisabled = isActive || capReached || !adsEnabled;

  const buttonLabel =
    isActive
      ? 'Reklam Hazırlanıyor...'
      : capReached
      ? 'Günlük Limit Doldu'
      : `Reklam İzle, +${rewardAmount} Guru Token Kazan`;

  return (
    <div
      className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm"
      aria-label="Guru Token kazan"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
          <Coins className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Guru Token Kazan</h2>
          <p className="text-sm text-gray-500">Reklam izleyerek ücretsiz token edin</p>
        </div>
      </div>

      {/* Reward info */}
      <div className="mb-5 rounded-xl bg-white/70 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Her reklam için</span>
          <span className="text-2xl font-bold text-purple-700">+{rewardAmount} Token</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">Bugün kalan hak</span>
          {capReached ? (
            <span className="flex items-center gap-1 text-sm font-medium text-orange-600">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Limit Doldu
            </span>
          ) : (
            <span className="text-sm font-medium text-green-700">
              {remainingToday} token daha kazanabilirsin
            </span>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mb-4 text-xs text-gray-500">
        Reklamı tamamladığında hesabına Guru Token eklenir.{' '}
        <strong>Tokenlar yalnızca uygulama içinde kullanılır</strong>; nakde,
        kripto paraya veya başka bir hesaba aktarılamaz.
      </p>

      {/* CTA Button */}
      <button
        onClick={onStart}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isActive}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white shadow transition-all hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isActive ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        ) : (
          <PlayCircle className="h-5 w-5" aria-hidden="true" />
        )}
        {buttonLabel}
      </button>
    </div>
  );
}
