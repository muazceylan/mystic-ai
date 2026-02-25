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

export interface UserProfile {
  id?: number;
  username?: string;
  email?: string;
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
  birthTimeUnknown?: boolean;
  timezone?: string;
  gender?: string;
  maritalStatus?: string;
  relationshipStage?: string;
  hasChildren?: boolean;
  focusPoint?: string;
  zodiacSign?: string;
  preferredLanguage?: string;
  roles?: string[];
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  isHydrated: boolean;

  login: (token: string, refreshToken: string | null, user: UserProfile) => void;
  logout: () => void;
  setUser: (user: UserProfile) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,
      isHydrated: false,

      login: (token, refreshToken, user) => {
        setToken(token);
        if (refreshToken) setRefreshToken(refreshToken);
        set({
          token,
          refreshToken,
          isAuthenticated: true,
          user,
        });
      },

      logout: () => {
        removeToken();
        removeRefreshToken();
        set({
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
        });
      },

      setUser: (user) => set({ user }),

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
