'use client';

import React, { useEffect, useRef } from 'react';
import { PlayCircle, X, Info } from 'lucide-react';

interface RewardConsentDialogProps {
  rewardAmount: number;
  rewardType: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Consent dialog shown when a rewarded ad is ready (slot ready event).
 * The user must explicitly accept before the ad is displayed.
 *
 * Accessibility:
 * - Focus is moved to the dialog on open (focus trap).
 * - Escape key triggers decline.
 * - Buttons have clear accessible labels.
 * - role="dialog" + aria-modal="true" for screen readers.
 */
export function RewardConsentDialog({
  rewardAmount,
  rewardType,
  onAccept,
  onDecline,
}: RewardConsentDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);

  // Move focus to the dialog when it opens.
  useEffect(() => {
    acceptBtnRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDecline]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDecline();
      }}
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-dialog-title"
        aria-describedby="consent-dialog-desc"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onDecline}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <PlayCircle className="h-8 w-8 text-purple-600" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2
          id="consent-dialog-title"
          className="mb-1 text-center text-xl font-bold text-gray-900"
        >
          Reklam İzle, Token Kazan
        </h2>

        {/* Reward amount */}
        <p className="mb-4 text-center text-3xl font-extrabold text-purple-700">
          +{rewardAmount} Guru Token
        </p>

        {/* Description */}
        <div
          id="consent-dialog-desc"
          className="mb-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700"
        >
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
              <span>
                Reklamı <strong>tamamladığında</strong> {rewardAmount} Guru Token hesabına eklenir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
              <span>
                Token&apos;lar <strong>yalnızca uygulama içinde</strong> kullanılır; nakde,
                kripto paraya veya başka bir hesaba aktarılamaz.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
              <span>Reklamı izlemek tamamen <strong>gönüllüdür</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            ref={acceptBtnRef}
            onClick={onAccept}
            className="w-full rounded-xl bg-purple-600 py-3 text-base font-semibold text-white shadow transition hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            aria-label={`Reklamı izle ve ${rewardAmount} Guru Token kazan`}
          >
            Reklamı İzle
          </button>
          <button
            onClick={onDecline}
            className="w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-400"
            aria-label="Reklamı izlemeyi reddet"
          >
            Hayır, Teşekkürler
          </button>
        </div>
      </div>
    </div>
  );
}
