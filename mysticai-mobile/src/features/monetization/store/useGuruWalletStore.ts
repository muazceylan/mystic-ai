import { create } from 'zustand';
import type { GuruWallet } from '../types';
import { fetchWallet, fetchWalletBalance } from '../api/monetization.service';

interface GuruWalletState {
  wallet: GuruWallet | null;
  loading: boolean;
  lastFetchedAt: number;

  loadWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  getBalance: () => number;
  clearWallet: () => void;
}

const CACHE_WINDOW = 30_000; // 30 seconds

export const useGuruWalletStore = create<GuruWalletState>((set, get) => ({
  wallet: null,
  loading: false,
  lastFetchedAt: 0,

  loadWallet: async () => {
    if (get().loading) return;
    if (Date.now() - get().lastFetchedAt < CACHE_WINDOW && get().wallet !== null) return;
    set({ loading: true });
    try {
      const wallet = await fetchWallet();
      set({ wallet, lastFetchedAt: Date.now(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  refreshBalance: async () => {
    try {
      const balance = await fetchWalletBalance();
      set(state => ({
        wallet: state.wallet ? { ...state.wallet, currentBalance: balance } : null,
      }));
    } catch {
      // silent — balance refresh is best-effort
    }
  },

  getBalance: () => get().wallet?.currentBalance ?? 0,

  clearWallet: () => set({ wallet: null, lastFetchedAt: 0 }),
}));
