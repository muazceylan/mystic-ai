'use client';

import React from 'react';
import type { RewardedAdPhase } from '@/types/rewards';

interface RewardLoadingStateProps {
  phase: RewardedAdPhase;
}

const PHASE_LABELS: Partial<Record<RewardedAdPhase, string>> = {
  creating:   'Reklam seansı hazırlanıyor...',
  loading_ad: 'Reklam yükleniyor...',
  showing:    'Reklam oynatılıyor...',
  granted:    'Ödül alındı, işleniyor...',
  claiming:   'Token hesabına ekleniyor...',
};

/**
 * Inline loading indicator for rewarded-ad flow phases.
 * Uses aria-live to announce state changes to screen readers.
 */
export function RewardLoadingState({ phase }: RewardLoadingStateProps) {
  const label = PHASE_LABELS[phase];
  if (!label) return null;

  return (
    <div
      className="flex items-center justify-center gap-3 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-purple-800">{label}</span>
    </div>
  );
}
