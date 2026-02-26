import { create } from 'zustand';
import type { Mood } from '../types';

type Phase = 'IDLE' | 'INHALE' | 'HOLD' | 'EXHALE' | 'DONE';

interface MeditationSessionState {
  running: boolean;
  elapsedSec: number;
  cycles: number;
  phase: Phase;
  moodBefore?: Mood;
  moodAfter?: Mood;
  setRunning: (running: boolean) => void;
  tick: () => void;
  setCycles: (cycles: number) => void;
  setPhase: (phase: Phase) => void;
  setMoodBefore: (mood?: Mood) => void;
  setMoodAfter: (mood?: Mood) => void;
  reset: () => void;
}

export const useMeditationSessionStore = create<MeditationSessionState>((set) => ({
  running: false,
  elapsedSec: 0,
  cycles: 0,
  phase: 'IDLE',
  moodBefore: undefined,
  moodAfter: undefined,
  setRunning: (running) => set({ running }),
  tick: () => set((s) => ({ elapsedSec: s.elapsedSec + 1 })),
  setCycles: (cycles) => set({ cycles }),
  setPhase: (phase) => set({ phase }),
  setMoodBefore: (moodBefore) => set({ moodBefore }),
  setMoodAfter: (moodAfter) => set({ moodAfter }),
  reset: () =>
    set({
      running: false,
      elapsedSec: 0,
      cycles: 0,
      phase: 'IDLE',
      moodBefore: undefined,
      moodAfter: undefined,
    }),
}));

