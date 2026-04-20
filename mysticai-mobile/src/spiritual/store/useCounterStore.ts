/**
 * Zikirmatik / Sayaç Store — tap-to-decrement modeli
 * Reducer pattern: tüm state geçişleri pure fonksiyonlar üzerinden.
 */

import { create } from 'zustand';

export type CounterStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface CounterState {
  itemType: 'esma' | 'dua' | null;
  itemId: number | null;
  itemName: string;
  target: number;
  remaining: number;
  completed: number;
  status: CounterStatus;
  startedAt: number | null; // epoch ms
  elapsedMs: number; // ms — paused süre dahil
  history: number[]; // her tap anındaki remaining değerleri (undo için)
  hapticEnabled: boolean;

  // Actions
  start: (params: { itemType: 'esma' | 'dua'; itemId: number; itemName: string; target: number; hapticEnabled?: boolean }) => void;
  tap: () => void;
  increment: () => void;
  undo: () => void;
  reset: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  setHaptic: (enabled: boolean) => void;
  addElapsed: (ms: number) => void;
}

const INITIAL: Omit<CounterState, keyof { start: unknown; tap: unknown; increment: unknown; undo: unknown; reset: unknown; pause: unknown; resume: unknown; finish: unknown; setHaptic: unknown; addElapsed: unknown }> = {
  itemType: null,
  itemId: null,
  itemName: '',
  target: 33,
  remaining: 33,
  completed: 0,
  status: 'idle',
  startedAt: null,
  elapsedMs: 0,
  history: [],
  hapticEnabled: true,
};

export const useCounterStore = create<CounterState>((set, get) => ({
  ...INITIAL,

  start: ({ itemType, itemId, itemName, target, hapticEnabled = true }) => {
    set({
      itemType,
      itemId,
      itemName,
      target,
      remaining: target,
      completed: 0,
      status: 'running',
      startedAt: Date.now(),
      elapsedMs: 0,
      history: [],
      hapticEnabled,
    });
  },

  tap: () => {
    const { remaining, completed, history, status, target } = get();
    if (status !== 'running' || remaining <= 0) return;

    const newRemaining = remaining - 1;
    const newCompleted = completed + 1;
    const newHistory = [...history, remaining]; // mevcut değeri history'e ekle

    if (newRemaining === 0) {
      set({
        remaining: 0,
        completed: newCompleted,
        history: newHistory,
        status: 'finished',
      });
    } else {
      set({
        remaining: newRemaining,
        completed: newCompleted,
        history: newHistory,
      });
    }
  },

  increment: () => {
    const { remaining, completed, status, target } = get();
    if (status !== 'running' || completed <= 0) return;
    set({
      remaining: remaining + 1,
      completed: completed - 1,
    });
  },

  undo: () => {
    const { history, completed, status } = get();
    if (history.length === 0 || (status !== 'running' && status !== 'finished')) return;

    const prev = history[history.length - 1];
    set({
      remaining: prev,
      completed: Math.max(0, completed - 1),
      history: history.slice(0, -1),
      status: 'running',
    });
  },

  reset: () => {
    const { target, itemType, itemId, itemName, hapticEnabled } = get();
    set({
      ...INITIAL,
      target,
      remaining: target,
      itemType,
      itemId,
      itemName,
      hapticEnabled,
      status: 'running',
      startedAt: Date.now(),
    });
  },

  pause: () => {
    const { status } = get();
    if (status !== 'running') return;
    set({ status: 'paused' });
  },

  resume: () => {
    const { status } = get();
    if (status !== 'paused') return;
    set({ status: 'running' });
  },

  finish: () => {
    set({ status: 'finished' });
  },

  setHaptic: (enabled) => set({ hapticEnabled: enabled }),

  addElapsed: (ms) => set((s) => ({ elapsedMs: s.elapsedMs + ms })),
}));

// --- Selector Helpers ---------------------------------------------------

export const selectProgress = (s: CounterState) =>
  s.target > 0 ? (s.completed / s.target) : 0;

export const selectIsFinished = (s: CounterState) =>
  s.status === 'finished' || s.remaining === 0;
