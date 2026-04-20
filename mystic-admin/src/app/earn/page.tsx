/**
 * /earn — Web rewarded-ad page for Guru Token earning.
 *
 * This is a user-facing page (not admin-only). It renders without the AdminLayout.
 * Auth: user must have a valid auth_token in localStorage (gateway JWT).
 *
 * Flow:
 *   1. Wallet summary loaded on mount.
 *   2. User clicks "Watch Ad" → startAdFlow().
 *   3. Backend creates intent → GPT slot requested.
 *   4. GPT fires rewardedSlotReady → consent dialog shown.
 *   5. User accepts → ad shown via makeRewardedVisible().
 *   6. GPT fires rewardedSlotGranted → backend claim → success dialog.
 *   7. Slot destroyed; wallet balance updated.
 */

import type { Metadata } from 'next';
import EarnPageClient from './EarnPageClient';

export const metadata: Metadata = {
  title: 'Guru Token Kazan | Mystic AI',
  description:
    'Reklam izleyerek ücretsiz Guru Token kazan. Tokenlar uygulama içi özellikler için kullanılır.',
  robots: { index: false, follow: false }, // Internal user-facing page.
};

export default function EarnPage() {
  return <EarnPageClient />;
}
