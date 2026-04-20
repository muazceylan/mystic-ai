'use client';

import React from 'react';
import { MonitorSmartphone, AlertCircle } from 'lucide-react';

interface RewardUnsupportedStateProps {
  reason?: 'browser' | 'blocker' | 'generic';
}

const messages = {
  browser: {
    title: 'Bu Ortam Desteklenmiyor',
    body: 'Rewarded reklam özelliği bu tarayıcı veya cihazda kullanılamıyor. Masaüstü Chrome/Firefox/Safari\'de deneyebilirsiniz.',
  },
  blocker: {
    title: 'Reklam Engelleyici Algılandı',
    body: 'Bir reklam engelleyici aktif olduğu için reklam izleyemiyorsunuz. Lütfen bu sayfa için reklam engelleyiciyi devre dışı bırakın.',
  },
  generic: {
    title: 'Rewarded Reklam Mevcut Değil',
    body: 'Bu cihaz veya ağda rewarded reklam özelliği kullanılamıyor.',
  },
};

/**
 * Displayed when the rewarded ad format is not supported in the current environment.
 */
export function RewardUnsupportedState({ reason = 'generic' }: RewardUnsupportedStateProps) {
  const msg = messages[reason];
  return (
    <div
      className="rounded-2xl border border-orange-200 bg-orange-50 p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          {reason === 'browser'
            ? <MonitorSmartphone className="h-6 w-6 text-orange-600" aria-hidden="true" />
            : <AlertCircle className="h-6 w-6 text-orange-600" aria-hidden="true" />
          }
        </div>
        <h3 className="font-semibold text-gray-900">{msg.title}</h3>
        <p className="text-sm text-gray-600">{msg.body}</p>
      </div>
    </div>
  );
}
