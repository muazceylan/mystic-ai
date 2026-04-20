'use client';

import React from 'react';
import { Coins, History } from 'lucide-react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { WatchRewardAdCard } from '@/components/monetization/WatchRewardAdCard';
import { RewardConsentDialog } from '@/components/monetization/RewardConsentDialog';
import { RewardResultDialog } from '@/components/monetization/RewardResultDialog';
import { RewardUnsupportedState } from '@/components/monetization/RewardUnsupportedState';
import { RewardLoadingState } from '@/components/monetization/RewardLoadingState';

/**
 * Client component for the Earn page.
 * Separated from the server component (page.tsx) to keep metadata exports clean.
 */
export default function EarnPageClient() {
  const {
    phase,
    intent,
    claimResult,
    walletSummary,
    errorCode,
    errorMessage,
    startAdFlow,
    confirmConsent,
    declineConsent,
    resetFlow,
  } = useRewardedAd();

  // ── Derived booleans ─────────────────────────────────────────────────────

  const showConsent = phase === 'consent';
  const showLoading =
    phase === 'creating' ||
    phase === 'loading_ad' ||
    phase === 'showing' ||
    phase === 'granted' ||
    phase === 'claiming';
  const showResult =
    phase === 'success' ||
    phase === 'error' ||
    phase === 'no_fill' ||
    phase === 'closed' ||
    phase === 'cap_reached';
  const showUnsupported = phase === 'unsupported';

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">

        {/* Page header */}
        <header className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Guru Token Kazan
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Ücretsiz Guru Token kazanmak için reklam izle.
            Tokenlar yalnızca uygulama içinde kullanılır.
          </p>
        </header>

        {/* Current balance banner */}
        {walletSummary && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-purple-500" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Mevcut Bakiye</span>
            </div>
            <span className="text-xl font-bold text-purple-700" aria-label={`${walletSummary.currentBalance} Guru Token`}>
              {walletSummary.currentBalance}
              <span className="ml-1 text-sm font-normal text-gray-500">Token</span>
            </span>
          </div>
        )}

        {/* Main CTA card */}
        <WatchRewardAdCard
          phase={phase}
          walletSummary={walletSummary}
          onStart={startAdFlow}
        />

        {/* Loading state */}
        {showLoading && <RewardLoadingState phase={phase} />}

        {/* Unsupported environment */}
        {showUnsupported && (
          <RewardUnsupportedState
            reason={
              errorCode === 'UNSUPPORTED' ? 'browser' : 'generic'
            }
          />
        )}

        {/* Token info section */}
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5"
          aria-label="Guru Token hakkında"
        >
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            <History className="h-4 w-4 text-purple-500" aria-hidden="true" />
            Guru Token Nedir?
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✅ Uygulama içi özellikleri açmak için kullanılır</li>
            <li>✅ Günlük ücretsiz kazanım hakkı mevcuttur</li>
            <li>❌ Nakde, kripto paraya veya gift card&apos;a dönüştürülemez</li>
            <li>❌ Başka kullanıcılara transfer edilemez</li>
            <li>❌ Herhangi bir para karşılığı talep edilemez</li>
          </ul>
        </section>

        {/* Daily stats */}
        {walletSummary && (
          <section
            className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm"
            aria-label="Günlük kazanım durumu"
          >
            <div className="flex justify-between text-gray-600">
              <span>Bugün kazandığın</span>
              <span className="font-medium">{walletSummary.dailyEarnedToday} Token</span>
            </div>
            <div className="mt-2 flex justify-between text-gray-600">
              <span>Günlük kalan hak</span>
              <span className={`font-medium ${walletSummary.dailyCapReached ? 'text-orange-600' : 'text-green-700'}`}>
                {walletSummary.dailyCapReached
                  ? 'Limit doldu'
                  : `${walletSummary.remainingToday} Token daha`}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{
                  width: `${walletSummary.dailyLimit > 0
                    ? Math.min(100, (walletSummary.dailyEarnedToday / walletSummary.dailyLimit) * 100)
                    : 0}%`,
                }}
              />
            </div>
          </section>
        )}
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────── */}

      {/* Consent dialog */}
      {showConsent && intent && (
        <RewardConsentDialog
          rewardAmount={intent.rewardAmount}
          rewardType={intent.rewardType}
          onAccept={confirmConsent}
          onDecline={declineConsent}
        />
      )}

      {/* Result dialog */}
      {showResult && (
        <RewardResultDialog
          phase={phase}
          claimResult={claimResult}
          errorCode={errorCode}
          errorMessage={errorMessage}
          onClose={resetFlow}
          onRetry={
            phase !== 'success' && phase !== 'cap_reached' ? startAdFlow : undefined
          }
        />
      )}
    </main>
  );
}
