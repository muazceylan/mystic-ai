import { create } from 'zustand';
import type { UserProfile } from './useAuthStore';

interface PendingGuestSession {
  accessToken: string;
  refreshToken: string | null;
  user: UserProfile;
}

interface PendingGuestState {
  session: PendingGuestSession | null;
  set: (session: PendingGuestSession) => void;
  clear: () => void;
}

/** Non-persisted store — holds the guest session between quickStart and guest-name screen. */
export const usePendingGuestStore = create<PendingGuestState>((set) => ({
  session: null,
  set: (session) => set({ session }),
  clear: () => set({ session: null }),
}));
