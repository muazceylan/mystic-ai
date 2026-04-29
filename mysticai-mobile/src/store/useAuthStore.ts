import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  zustandStorage,
  setToken,
  removeToken,
  setRefreshToken,
  removeRefreshToken,
  getToken,
} from '../utils/storage';
import { clearHoroscopeCache } from '../features/horoscope/services/horoscope.service';
import { clearPlannerFullDistributionCache } from '../services/lucky-dates.service';

export type UserType = 'GUEST' | 'REGISTERED';

export interface UserProfile {
  id?: number;
  username?: string;
  email?: string;
  accountStatus?: string;
  emailVerifiedAt?: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  birthDate?: string;
  birthTime?: string | null;
  birthLocation?: string;
  birthCountry?: string;
  birthCity?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  avatarUri?: string | null;
  avatarUrl?: string | null;
  birthTimeUnknown?: boolean;
  timezone?: string;
  gender?: string;
  maritalStatus?: string;
  relationshipStage?: string;
  hasChildren?: boolean;
  zodiacSign?: string;
  preferredLanguage?: string;
  roles?: string[];
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hasPassword?: boolean;
  provider?: string | null;
  /** GUEST = anonymous quick-start session; REGISTERED = full account */
  userType?: UserType;
  isAnonymous?: boolean;
  isAccountLinked?: boolean;
}

/** Returns true if the user is an anonymous guest session. */
export function isGuestUser(user: UserProfile | null | undefined): boolean {
  return user?.userType === 'GUEST' || user?.isAnonymous === true;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  isHydrated: boolean;
  pendingEmail: string | null;
  lastResendAt: number | null;

  login: (token: string, refreshToken: string | null, user: UserProfile) => void;
  logout: () => void;
  setUser: (user: UserProfile) => void;
  hydrate: () => Promise<void>;
  setPendingEmail: (email: string | null) => void;
  setLastResendAt: (timestamp: number | null) => void;
  clearVerificationContext: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,
      isHydrated: false,
      pendingEmail: null,
      lastResendAt: null,

      login: (token, refreshToken, user) => {
        setToken(token);
        if (refreshToken) setRefreshToken(refreshToken);
        set({
          token,
          refreshToken,
          isAuthenticated: true,
          user,
          pendingEmail: null,
          lastResendAt: null,
        });
      },

      logout: () => {
        removeToken();
        removeRefreshToken();

        // Clear all user-specific stores & caches
        try {
          const { useNatalChartStore } = require('./useNatalChartStore');
          useNatalChartStore.getState().clear();
        } catch {}
        try {
          const { useLuckyDatesStore } = require('./useLuckyDatesStore');
          useLuckyDatesStore.getState().clear();
        } catch {}
        try {
          const { useHoroscopeStore } = require('../features/horoscope/store/useHoroscopeStore');
          useHoroscopeStore.getState().clear();
        } catch {}
        try {
          const { useSynastryStore } = require('./useSynastryStore');
          useSynastryStore.getState().clearSynastry();
          useSynastryStore.getState().clearError();
        } catch {}
        try {
          const { useDreamStore } = require('./useDreamStore');
          useDreamStore.getState().clearError();
        } catch {}
        try {
          clearHoroscopeCache();
        } catch {}
        try {
          clearPlannerFullDistributionCache();
        } catch {}
        try {
          const { useNotificationStore } = require('./useNotificationStore');
          useNotificationStore.getState().reset();
        } catch {}
        try {
          const { useGuestPromptStore } = require('./useGuestPromptStore');
          useGuestPromptStore.getState().reset();
        } catch {}
        try {
          const { useOnboardingStore } = require('./useOnboardingStore');
          useOnboardingStore.getState().reset();
        } catch {}
        try {
          const { useMonetizationStore, clearMonetizationCache } = require('../features/monetization');
          clearMonetizationCache();
          useMonetizationStore.setState({ config: null, lastFetchedAt: 0 });
          useMonetizationStore.getState().clearExposure();
        } catch {}
        try {
          const { useGuruWalletStore } = require('../features/monetization');
          useGuruWalletStore.getState().clearWallet();
        } catch {}
        try {
          const { clearAllNavigationIntents } = require('../navigation/navigationIntentStore');
          clearAllNavigationIntents();
        } catch {}

        set({
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
          pendingEmail: null,
          lastResendAt: null,
        });
      },

      setUser: (user) => set({ user }),
      setPendingEmail: (email) => set({ pendingEmail: email }),
      setLastResendAt: (timestamp) => set({ lastResendAt: timestamp }),
      clearVerificationContext: () => set({ pendingEmail: null, lastResendAt: null }),

      hydrate: async () => {
        const token = await getToken();
        if (token) {
          set({ token, isAuthenticated: true, isHydrated: true });
        } else {
          set({ isAuthenticated: false, isHydrated: true });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          // Sync token to fast-access MMKV key
          if (state.token) {
            setToken(state.token);
          }
        }
      },
    }
  )
);

// Backward-compatible alias
export type AuthUser = UserProfile;
